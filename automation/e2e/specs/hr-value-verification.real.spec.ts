import { expect, test, type Page, type Response } from "@playwright/test";

const LOGIN_ID = process.env.REAL_API_LOGIN_ID || "dhyanIT";
const PASSWORD = process.env.REAL_API_PASSWORD || "dhyanIT@1";

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  if (!(await page.getByTestId("login-page").isVisible().catch(() => false))) {
    const signupSignIn = page.getByRole("button", { name: /^Sign in$/i });
    if (await signupSignIn.isVisible().catch(() => false)) await signupSignIn.click();
  }
  await expect(page.getByTestId("login-page"), "The sign-in page must be open before authentication").toBeVisible();
  await page.getByTestId("auth-login-id").fill(LOGIN_ID);
  await page.getByTestId("auth-login-password").fill(PASSWORD);

  let failedLoginResponse: Response | null = null;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() >= 400) failedLoginResponse = response;
  });
  await page.getByTestId("auth-login-submit").click();

  const result = await Promise.race([
    page.waitForURL((url) => !/\/(login|signup)(\/|$)/.test(url.pathname), {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    }).then(() => ({ authenticated: true as const }))
      .catch(() => ({ authenticated: false as const, message: "Login did not navigate away from the sign-in page" })),
    page.getByText(/request failed|invalid credentials|sign[ -]?in failed|login failed/i).first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(async () => ({ authenticated: false as const, message: await page.getByText(/request failed|invalid credentials|sign[ -]?in failed|login failed/i).first().innerText() })),
  ]);

  if (!result.authenticated) {
    throw new Error(
      `Authentication failed before HR verification: ${result.message}` +
      (failedLoginResponse ? ` (${failedLoginResponse.status()} ${failedLoginResponse.url()})` : ""),
    );
  }
}

function bodyOf(raw: unknown): Record<string, unknown> {
  let value = raw;
  for (let index = 0; index < 3; index += 1) {
    if (!value || typeof value !== "object" || Array.isArray(value)) break;
    const nested = (value as Record<string, unknown>).data;
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) break;
    value = nested;
  }
  return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
}

function listOf(raw: unknown): Record<string, unknown>[] {
  let value = raw;
  for (let index = 0; index < 3; index += 1) {
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.content)) return record.content as Record<string, unknown>[];
    value = record.data;
  }
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}

async function openWithApi(page: Page, path: string, apiPart: string): Promise<Response> {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "GET" && response.url().includes(apiPart) && response.ok(),
    { timeout: 30_000 },
  );
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return responsePromise;
}

test.describe("HR value and API verification", () => {
  test.beforeEach(async ({ page }) => login(page));

  const moduleCases = [
    ["MOD-001", "Dashboard", "/hr", "hr-dashboard-page"],
    ["MOD-002", "Employees", "/hr/employees", "hr-employees-table-container"],
    ["MOD-003", "Attendance", "/hr/attendance", "hr-attendance-page"],
    ["MOD-004", "Leave", "/hr/leave", "hr-leave-page"],
    ["MOD-005", "Payroll", "/hr/payroll", "hr-payroll-page"],
    ["MOD-006", "Assets", "/hr/assets", "hr-assets-section"],
    ["MOD-007", "Separation", "/hr/separation", "hr-separation-page"],
    ["MOD-008", "Tickets", "/hr/tickets", "hr-tickets-page"],
    ["MOD-009", "Expenses", "/hr/expenses", "hr-expenses-page"],
    ["MOD-010", "Announcements", "/hr/announcements", "hr-announcements-page"],
    ["MOD-011", "Recruitment", "/hr/recruitment", "hr-recruitment-section"],
    ["MOD-012", "Reports", "/hr/reports", "hr-reports-page"],
    ["MOD-013", "Settings", "/hr/settings", "hr-settings-page"],
    ["MOD-014", "Audit Logs", "/hr/audit-logs", "hr-audit-logs-page"],
  ] as const;

  for (const [caseId, moduleName, route, testId] of moduleCases) {
    test(`${caseId} ${moduleName} loads without failed HR API calls`, async ({ page }) => {
      const failedCalls: string[] = [];
      page.on("response", (response) => {
        if (response.status() >= 500 && /hr-service|\/hr\//i.test(response.url())) {
          failedCalls.push(`${response.status()} ${response.request().method()} ${response.url()}`);
        }
      });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByText(/s is not defined|useRef is not defined|render_failed/i)).toHaveCount(0);
      await page.waitForTimeout(500);
      expect(failedCalls, `${moduleName} received server errors`).toEqual([]);
    });
  }

  test("PAY-SET-001 payroll settings API values are rendered in the UI", async ({ page }) => {
    const response = await openWithApi(page, "/hr/settings/payroll", "/payroll-settings");
    const settings = bodyOf(await response.json());
    await expect(page.getByTestId("hr-settings-payroll-panel")).toBeVisible();

    const valueCases: Array<[string, string]> = [
      ["payDay", "hr-settings-payroll-payday"],
      ["workingDaysBasis", "hr-settings-payroll-workingdaysbasis"],
      ["fixedWorkingDays", "hr-settings-payroll-fixedworkingdays"],
      ["pfEmployeeRate", "hr-settings-payroll-pfemployeerate"],
      ["pfEmployerRate", "hr-settings-payroll-pfemployerrate"],
      ["pfWageCeiling", "hr-settings-payroll-pfwageceiling"],
      ["pfBaseType", "hr-settings-payroll-pfbasetype"],
      ["esiRate", "hr-settings-payroll-esirate"],
      ["esiEmployerRate", "hr-settings-payroll-esiemployerrate"],
      ["esiGrossCeiling", "hr-settings-payroll-esigrossceiling"],
    ];
    for (const [apiField, testId] of valueCases) {
      if (settings[apiField] != null) await expect.soft(page.getByTestId(testId), apiField).toHaveValue(String(settings[apiField]));
    }
    if (settings.payDayType) {
      await expect.soft(page.locator(`[data-testid="hr-settings-payroll-paydaytype"] input[value="${settings.payDayType}"]`)).toBeChecked();
    }
  });

  test("ATT-SET-001 attendance rule API values are rendered in the UI", async ({ page }) => {
    const response = await openWithApi(page, "/hr/settings/attendance", "/attendance-rules");
    const rules = bodyOf(await response.json());
    await expect(page.getByTestId("hr-settings-attendance-panel")).toBeVisible();

    const valueCases: Array<[string, string]> = [
      ["workHoursPerDay", "hr-settings-attendance-workhoursperday"],
      ["fullDayThresholdHours", "hr-settings-attendance-fulldaythresholdhours"],
      ["graceMinutes", "hr-settings-attendance-graceminutes"],
      ["lateThresholdMinutes", "hr-settings-attendance-latethresholdminutes"],
      ["halfDayThresholdMinutes", "hr-settings-attendance-halfdaythresholdminutes"],
      ["geofenceRadiusMeters", "hr-settings-attendance-geofenceradiusmeters"],
      ["autoClockOutMinutes", "hr-settings-attendance-autoclockoutminutes"],
    ];
    for (const [apiField, testId] of valueCases) {
      if (rules[apiField] != null) await expect.soft(page.getByTestId(testId), apiField).toHaveValue(String(rules[apiField]));
    }
    if (rules.faceRecognitionRequired != null) {
      await expect.soft(page.getByTestId("hr-settings-attendance-facerecognitionrequired")).toBeChecked({ checked: Boolean(rules.faceRecognitionRequired) });
    }
  });

  test("POL-RULE-001 policy outcomes and table/card views match the API", async ({ page }) => {
    const response = await openWithApi(page, "/hr/settings/policyrules", "/policy-rules?domain=ATTENDANCE");
    const rules = listOf(await response.json());
    await expect(page.getByTestId("hr-settings-policy-rules-panel")).toBeVisible();
    await expect(page.getByTestId("hr-settings-policy-rules-view-table")).toHaveAttribute("data-active", "true");

    if (rules.length > 0) {
      const first = rules[0];
      await expect(page.getByTestId("hr-settings-policy-rules-table")).toContainText(String(first.name ?? ""));
      const outcomes = Array.isArray(first.outcomes) ? first.outcomes : [];
      await expect(page.getByTestId("hr-settings-policy-rules-table")).toContainText(`${outcomes.length}:`);
    }

    await page.getByTestId("hr-settings-policy-rules-view-card").click();
    await expect(page.getByTestId("hr-settings-policy-rules-view-card")).toHaveAttribute("data-active", "true");
    await page.getByTestId("hr-settings-policy-rules-add").click();
    await expect(page.getByTestId("hr-settings-policy-rules-form")).toBeVisible();
    await expect(page.getByTestId("hr-settings-policy-rules-outcome-0")).toBeVisible();
    await page.getByTestId("hr-settings-policy-rules-add-outcome").click();
    await expect(page.getByTestId("hr-settings-policy-rules-outcome-1")).toBeVisible();
  });

  test("SHIFT-ROT-001 rotation sequence, defaults and API values are rendered", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "GET" && /\/shift-rotations(?:\?|$)/.test(response.url()) && response.ok(),
      { timeout: 30_000 },
    );
    await page.goto("/hr/settings/shifts", { waitUntil: "domcontentloaded" });
    const rotations = listOf(await (await responsePromise).json());
    await page.getByTestId("hr-settings-shifts-tab-rotations").click();
    await expect(page.getByTestId("hr-settings-rotations-panel")).toBeVisible();

    if (rotations.length > 0) {
      const first = rotations[0];
      const uid = String(first.uid ?? first.id ?? "");
      const row = page.getByTestId(`hr-settings-rotations-row-${uid}`);
      await expect(row).toContainText(String(first.name ?? ""));
      if (first.rotationPeriodDays != null) await expect(row).toContainText(`${first.rotationPeriodDays} days`);
      if (first.startDate) await expect(row).toContainText(String(first.startDate));
    }

    await page.getByTestId("hr-settings-rotations-add").click();
    await expect(page.getByTestId("hr-settings-rotations-active")).toBeChecked();
    await expect(page.getByTestId("hr-settings-rotations-period")).toHaveValue("7");
    await expect(page.getByTestId("hr-settings-rotations-startdate")).not.toHaveValue("");
  });

  test("ATT-SHIFT-001 attendance displays the backend-resolved effective shift", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("/attendance/search") && response.ok(),
      { timeout: 30_000 },
    );
    await page.goto("/hr/attendance/logs", { waitUntil: "domcontentloaded" });
    const records = listOf(await (await responsePromise).json());
    const record = records.find((item) => item.effectiveShiftName || item.shiftName || item.noShiftAssigned || item.shiftResolutionSource === "NONE");
    test.skip(!record, "The HR service has not returned effective-shift metadata for any attendance record yet.");

    const uid = String(record!.uid ?? record!.id ?? "");
    const expected = record!.noShiftAssigned || String(record!.shiftResolutionSource ?? "").toUpperCase() === "NONE"
      ? "No shift assigned"
      : String(record!.effectiveShiftName ?? record!.shiftName ?? "");
    await expect(page.getByTestId(`hr-attendance-effective-shift-${uid}`)).toContainText(expected);
  });

  test("AUD-FLT-001 Payroll context sends auditLogContext and never featureModule", async ({ page }) => {
    await page.goto("/hr/audit-logs", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("hr-audit-logs-page")).toBeVisible();
    const requestPromise = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().includes("/audit-logs/search"),
      { timeout: 20_000 },
    );
    await page.getByTestId("hr-audit-logs-context-payroll").click();
    const payload = (await requestPromise).postDataJSON() as {
      filters?: { conditions?: Array<{ field?: string; operator?: string; values?: string[] }> };
      page?: number;
      size?: number;
    };
    const conditions = payload.filters?.conditions ?? [];
    expect(conditions).toContainEqual(expect.objectContaining({ field: "auditLogContext", operator: "EQ", values: ["PAYROLL"] }));
    expect(conditions.some((condition) => condition.field === "featureModule")).toBe(false);
    expect(payload.page).toBe(0);
    expect(payload.size).toBeGreaterThan(0);
  });

  test("AST-RET-001 asset return UI uses Condition and spaced Under Repair", async ({ page }) => {
    await page.goto("/hr/assets", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("hr-assets-section")).toBeVisible();
    const returnAction = page.locator('[data-testid^="hr-assets-return-"]').first();
    test.skip(!(await returnAction.isVisible().catch(() => false)), "No allocated asset is available for return verification.");
    await returnAction.click();
    await expect(page.getByTestId("hr-assets-return-status")).toBeVisible();
    await expect(page.getByTestId("hr-assets-return-status").locator('option[value="UnderRepair"]')).toHaveText("Under Repair");
    await expect(page.getByText("Condition", { exact: true })).toBeVisible();
  });
});
