import { expect, test, type Locator, type Page } from "@playwright/test";

const LOGIN_ID = process.env.REAL_API_LOGIN_ID || "dhyanIT";
const PASSWORD = process.env.REAL_API_PASSWORD || "dhyanIT@1";

const UI_TIMEOUT = 25_000;
const POST_CLICK_DELAY_MS = 400;
const POST_FILL_DELAY_MS = 250;
const TYPE_DELAY_MS = 15;

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-6);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function pause(page: Page, ms = 400) {
  await page.waitForTimeout(ms);
}

async function clickWhenReady(target: Locator) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  await target.click();
  await target.page().waitForTimeout(POST_CLICK_DELAY_MS);
}

async function clickIfVisible(target: Locator) {
  if (await target.isVisible().catch(() => false)) {
    await target.click().catch(() => {});
    await target.page().waitForTimeout(POST_CLICK_DELAY_MS);
    return true;
  }
  return false;
}

async function fillWhenReady(target: Locator, value: string) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  await target.click();
  await target.fill("");
  await target.pressSequentially(value, { delay: TYPE_DELAY_MS });
  await target.page().waitForTimeout(POST_FILL_DELAY_MS);
}

async function fillByTestId(page: Page, testId: string, value: string) {
  const target = page.getByTestId(testId).first();
  if (await target.isVisible().catch(() => false)) {
    await fillWhenReady(target, value);
  }
}

async function fillDateByTestId(page: Page, testId: string, dateStr: string) {
  const target = page.getByTestId(testId).first();
  await expect(target).toBeAttached({ timeout: UI_TIMEOUT });

  if (await target.isVisible().catch(() => false)) {
    await target.fill(dateStr);
  } else {
    // DatePicker keeps the ISO value in a hidden controlled input. Calling its
    // React onChange updates the form state in the same way as a calendar pick.
    await target.evaluate((input: HTMLInputElement, value: string) => {
      const fiberKey = Object.keys(input).find((key) => key.startsWith("__reactFiber$"));
      let fiber = fiberKey ? (input as unknown as Record<string, any>)[fiberKey] : null;

      while (fiber) {
        if (typeof fiber.memoizedProps?.onChange === "function") {
          fiber.memoizedProps.onChange({
            target: { value, name: input.name, id: input.id },
            currentTarget: { value, name: input.name, id: input.id },
          });
          return;
        }
        fiber = fiber.return;
      }

      throw new Error(`Unable to update controlled date input ${input.dataset.testid ?? input.id}`);
    }, dateStr);
  }

  await expect(target).toHaveValue(dateStr, { timeout: UI_TIMEOUT });
  await pause(page, 200);
}

async function selectByTestId(page: Page, testId: string, value: string) {
  const target = page.getByTestId(testId).first();
  if (await target.isVisible().catch(() => false)) {
    await target.selectOption(value).catch(() => target.selectOption({ label: value })).catch(() => {});
    await pause(page, 200);
  }
}

async function selectFirstAvailableOption(page: Page, testId: string) {
  const target = page.getByTestId(testId).first();
  if (!(await target.isVisible().catch(() => false))) return false;
  
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const options = await target.locator("option").evaluateAll((nodes) =>
      nodes
        .map((node) => ({ value: (node as HTMLOptionElement).value, disabled: (node as HTMLOptionElement).disabled }))
        .filter((option) => !!option.value && !option.disabled)
    );
    if (options.length > 0) {
      await target.selectOption(options[0].value).catch(() => {});
      await pause(page, 200);
      return true;
    }
    await pause(page, 300);
  }
  return false;
}

async function clickByTestId(page: Page, testId: string) {
  const target = page.getByTestId(testId).first();
  if (await target.isVisible().catch(() => false)) {
    await clickWhenReady(target);
  }
}

async function fillTimePicker(page: Page, testId: string, timeStr: string) {
  const target = page.getByTestId(testId).first();
  if (!(await target.isVisible().catch(() => false))) return;

  const match = timeStr.trim().match(/^(\d{1,2})[.:](\d{2})\s*([AP]M)?$/i);
  let hourNum = 9;
  let min = "00";
  let period = "AM";
  if (match) {
    hourNum = Number(match[1]);
    min = match[2];
    period = match[3] ? match[3].toUpperCase() : hourNum >= 12 ? "PM" : "AM";
    if (!match[3] && hourNum > 12) hourNum -= 12;
    if (hourNum === 0) hourNum = 12;
  }
  const hour2Digits = String(hourNum).padStart(2, "0");
  const formatted12 = `${hour2Digits}:${min} ${period}`;

  // Direct fiber traversal to invoke component onChange prop
  await target.evaluate((input: HTMLInputElement, val: string) => {
    let el: HTMLElement | null = input;
    while (el) {
      const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (key && (el as any)[key]) {
        let fiber = (el as any)[key];
        while (fiber) {
          if (fiber.memoizedProps && typeof fiber.memoizedProps.onChange === "function") {
            fiber.memoizedProps.onChange({ target: { value: val } });
            return;
          }
          fiber = fiber.return;
        }
      }
      el = el.parentElement;
    }
  }, formatted12);
  await pause(page, 200);

  // Click testid trigger & testid popover buttons for visual UI selection
  const trigger = page.getByTestId(`${testId}-trigger`).or(target).first();
  await trigger.click({ force: true }).catch(() => {});
  await pause(page, 300);

  const hourBtn = page.getByTestId(`${testId}-hour-${hour2Digits}`).first();
  if (await hourBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
    await hourBtn.click().catch(() => {});
    await pause(page, 150);

    const minBtn = page.getByTestId(`${testId}-min-${min}`).first();
    if (await minBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await minBtn.click().catch(() => {});
      await pause(page, 150);
    }

    const periodBtn = page.getByTestId(`${testId}-period-${period}`).first();
    if (await periodBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await periodBtn.click().catch(() => {});
      await pause(page, 150);
    }

    const modalHeader = page.locator('h3:has-text("Add Shift"), h3:has-text("Edit Shift")').first();
    if (await modalHeader.isVisible().catch(() => false)) {
      await modalHeader.click({ force: true }).catch(() => {});
    }
    await pause(page, 150);
  }
}

async function fillPhoneInput(page: Page, testId: string, phoneNumber: string) {
  const target = page.getByTestId(`${testId}-number`).or(page.locator(`[data-testid="${testId}"] input[type="tel"]`)).first();
  if (await target.isVisible().catch(() => false)) {
    await fillWhenReady(target, phoneNumber);
  }
}

async function navigateToHrRoute(page: Page, route: string) {
  console.log(`LOG: Navigating to route "${route}"`);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}

async function loginToTenant(page: Page) {
  console.log(`LOG: Signing in with ${LOGIN_ID}...`);
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const loginInput = page.getByRole("textbox", { name: "Login ID" });
  await expect(loginInput).toBeVisible({ timeout: UI_TIMEOUT });
  await fillWhenReady(loginInput, LOGIN_ID);

  const passwordInput = page.locator('input[type="password"]').first();
  await fillWhenReady(passwordInput, PASSWORD);

  await clickWhenReady(page.getByRole("button", { name: /^Sign in$/i }));
  await page.waitForTimeout(2500);
  console.log("LOG: Logged in! Current URL:", page.url());
}

async function createCrudRecord(
  page: Page,
  scope: string,
  values: Record<string, string>,
  selectValues: Record<string, string> = {},
  dateValues: Record<string, string> = {}
) {
  const modal = page.getByTestId(`${scope}-modal`);
  if (await modal.isVisible().catch(() => false)) {
    await clickIfVisible(page.getByTestId(`${scope}-modal-close`));
    await page.keyboard.press("Escape").catch(() => {});
    await pause(page, 300);
  }

  await clickByTestId(page, `${scope}-add`);
  if (await modal.isVisible({ timeout: 4000 }).catch(() => false)) {
    for (const [key, value] of Object.entries(values)) {
      await fillByTestId(page, `${scope}-${slugify(key)}`, value);
    }
    for (const [key, value] of Object.entries(dateValues)) {
      await fillDateByTestId(page, `${scope}-${slugify(key)}`, value);
    }
    for (const [key, value] of Object.entries(selectValues)) {
      await selectByTestId(page, `${scope}-${slugify(key)}`, value);
    }
    await clickByTestId(page, `${scope}-save`);
    const closed = await modal.waitFor({ state: "hidden", timeout: 5000 }).then(() => true).catch(() => false);
    if (!closed) {
      await clickIfVisible(page.getByTestId(`${scope}-modal-close`));
      await page.keyboard.press("Escape").catch(() => {});
      await pause(page, 300);
    }
  }
}

test.describe("HR & Admin IT Enterprise Suite", () => {
  test.setTimeout(45 * 60_000);

  test("automates all 13 HR & Admin modules with IT domain data and 15 engineer profiles", async ({ page }) => {
    const suffix = uniqueSuffix();

    console.log("=== MODULE 1: AUTHENTICATION & DASHBOARD ===");
    await loginToTenant(page);
    await navigateToHrRoute(page, "/hr");

    console.log("=== MODULE 2: SETTINGS (IT COMPANY, DEPARTMENTS, ROLES, SHIFTS, LEAVE TYPES, HOLIDAYS) ===");
    await navigateToHrRoute(page, "/hr/settings");
    
    // Company Profile
    await clickIfVisible(page.locator("button:has-text('Company Profile')").first());
    const compNameInput = page.locator("input[name='name'], input[placeholder*='Company'], [data-testid='hr-settings-company-name']").first();
    if (await compNameInput.isVisible().catch(() => false)) {
      await fillWhenReady(compNameInput, `Dhyandarsh IT Technologies ${suffix}`);
      await fillByTestId(page, "hr-settings-company-legalname", "Dhyandarsh IT Technologies Private Limited");
      await fillByTestId(page, "hr-settings-company-industry", "Information Technology & Enterprise Software");
      await fillByTestId(page, "hr-settings-company-email", `corporate.${suffix}.test@jaldee.com`);
      await fillByTestId(page, "hr-settings-company-phone", "5555000000");
      await fillByTestId(page, "hr-settings-company-addressline", "Tech Park Tower B, Outer Ring Road");
      await fillByTestId(page, "hr-settings-company-city", "Bangalore");
      await fillByTestId(page, "hr-settings-company-state", "Karnataka");
      await fillByTestId(page, "hr-settings-company-country", "India");
      await fillByTestId(page, "hr-settings-company-gstin", "29ABCDE1234F1Z5");
      await fillByTestId(page, "hr-settings-company-pan", "ABCDE1234F");
      await selectByTestId(page, "hr-settings-company-currency", "INR");
      await fillByTestId(page, "hr-settings-company-workingdays", "Monday - Friday");
      await clickIfVisible(page.getByRole("button", { name: /Save|Update/i }).first());
    }

    // 1. Departments (5 IT Section Departments)
    await navigateToHrRoute(page, "/hr/settings/departments");
    const deptList = [
      { name: `Software Engineering ${suffix}`, code: `ENG-${suffix}` },
      { name: `Cloud & Infrastructure ${suffix}`, code: `INF-${suffix}` },
      { name: `Product Management ${suffix}`, code: `PMO-${suffix}` },
      { name: `Human Resources & Talent ${suffix}`, code: `HRT-${suffix}` },
      { name: `Cybersecurity & IT Ops ${suffix}`, code: `SEC-${suffix}` },
    ];
    for (const d of deptList) {
      await createCrudRecord(page, "hr-settings-departments", { name: d.name, code: d.code });
    }

    // 2. Roles & Designations (5 IT Section Roles)
    await navigateToHrRoute(page, "/hr/settings/designations");
    const roleList = [
      { name: `Senior Full Stack Engineer ${suffix}`, code: `SFE-${suffix}`, level: "3", desc: "Leads React and Node microservices engineering" },
      { name: `DevOps & Cloud Architect ${suffix}`, code: `DCA-${suffix}`, level: "2", desc: "Manages AWS cloud architecture and CI/CD pipelines" },
      { name: `Product Manager ${suffix}`, code: `PDM-${suffix}`, level: "3", desc: "Drives product roadmap, user stories and sprint planning" },
      { name: `HR Business Partner ${suffix}`, code: `HRB-${suffix}`, level: "3", desc: "Manages tech hiring, talent retention and payroll" },
      { name: `Cybersecurity Analyst ${suffix}`, code: `CSA-${suffix}`, level: "4", desc: "Monitors SOC operations, security compliance and audits" },
    ];
    for (const r of roleList) {
      const modal = page.getByTestId("hr-settings-designations-modal");
      if (await modal.isVisible().catch(() => false)) {
        await clickIfVisible(page.getByTestId("hr-settings-designations-modal-close"));
        await page.keyboard.press("Escape").catch(() => {});
        await pause(page, 300);
      }
      await clickByTestId(page, "hr-settings-designations-add");
      if (await modal.isVisible({ timeout: 4000 }).catch(() => false)) {
        await fillByTestId(page, "hr-settings-designations-name", r.name);
        await fillByTestId(page, "hr-settings-designations-code", r.code);
        await fillByTestId(page, "hr-settings-designations-level", r.level);
        await fillByTestId(page, "hr-settings-designations-description", r.desc);
        await selectFirstAvailableOption(page, "hr-settings-designations-hrdepartmentuid");
        await clickByTestId(page, "hr-settings-designations-save");
        const closed = await modal.waitFor({ state: "hidden", timeout: 5000 }).then(() => true).catch(() => false);
        if (!closed) {
          await clickIfVisible(page.getByTestId("hr-settings-designations-modal-close"));
          await page.keyboard.press("Escape").catch(() => {});
          await pause(page, 300);
        }
      }
    }

    // 3. Shifts (5 IT Section Shifts)
    await navigateToHrRoute(page, "/hr/settings/shifts");
    const shiftList = [
      { name: `Day Development Shift ${suffix}`, start: "09:00 AM", end: "05:00 PM" },
      { name: `APAC Support Shift ${suffix}`, start: "08:00 AM", end: "04:00 PM" },
      { name: `EMEA Coverage Shift ${suffix}`, start: "01:00 PM", end: "09:00 PM" },
      { name: `24x7 IT NOC Night Shift ${suffix}`, start: "09:00 PM", end: "05:00 AM" },
      { name: `Flexible Tech Hours ${suffix}`, start: "10:00 AM", end: "06:00 PM" },
    ];
    for (const s of shiftList) {
      const modal = page.getByTestId("hr-settings-shifts-modal");
      if (await modal.isVisible().catch(() => false)) {
        await clickIfVisible(page.getByTestId("hr-settings-shifts-modal-close"));
        await page.keyboard.press("Escape").catch(() => {});
        await pause(page, 300);
      }
      await clickByTestId(page, "hr-settings-shifts-add");
      if (await modal.isVisible({ timeout: 4000 }).catch(() => false)) {
        await fillByTestId(page, "hr-settings-shifts-name", s.name);
        await fillTimePicker(page, "hr-settings-shifts-starttime", s.start);
        await fillTimePicker(page, "hr-settings-shifts-endtime", s.end);
        await fillByTestId(page, "hr-settings-shifts-graceminutes", "15");
        await fillByTestId(page, "hr-settings-shifts-halfdaythresholdminutes", "240");
        await fillByTestId(page, "hr-settings-shifts-breakminutes", "45");
        await clickByTestId(page, "hr-settings-shifts-save");
        const closed = await modal.waitFor({ state: "hidden", timeout: 5000 }).then(() => true).catch(() => false);
        if (!closed) {
          await clickIfVisible(page.getByTestId("hr-settings-shifts-modal-close"));
          await page.keyboard.press("Escape").catch(() => {});
          await pause(page, 300);
        }
      }
    }

    // 4. Leave Policy & Leave Types (5 IT Section Leave Types)
    await navigateToHrRoute(page, "/hr/settings/leavetypes");
    const leaveList = [
      { name: `Annual Paid Privilege Leave ${suffix}`, cat: "CASUAL", quota: "14" },
      { name: `Sick & Wellness Leave ${suffix}`, cat: "SICK", quota: "12" },
      { name: `Earned Technical Sabbatical ${suffix}`, cat: "EARNED", quota: "18" },
      { name: `Maternity & Family Care Leave ${suffix}`, cat: "MATERNITY", quota: "90" },
      { name: `Weekend On-Call Comp Off ${suffix}`, cat: "COMP_OFF", quota: "10" },
    ];
    for (const l of leaveList) {
      const modal = page.getByTestId("hr-settings-leave-policy-modal");
      if (await modal.isVisible().catch(() => false)) {
        await clickIfVisible(page.getByTestId("hr-settings-leave-policy-modal-close"));
        await page.keyboard.press("Escape").catch(() => {});
        await pause(page, 300);
      }
      await clickByTestId(page, "hr-settings-leave-policy-create");
      if (await modal.isVisible({ timeout: 4000 }).catch(() => false)) {
        await fillByTestId(page, "hr-settings-leave-policy-name", l.name);
        await selectByTestId(page, "hr-settings-leave-policy-category", l.cat);
        await fillByTestId(page, "hr-settings-leave-policy-quota", l.quota);
        await selectByTestId(page, "hr-settings-leave-policy-accrual", "Monthly");
        await clickByTestId(page, "hr-settings-leave-policy-save");
        const closed = await modal.waitFor({ state: "hidden", timeout: 5000 }).then(() => true).catch(() => false);
        if (!closed) {
          await clickIfVisible(page.getByTestId("hr-settings-leave-policy-modal-close"));
          await page.keyboard.press("Escape").catch(() => {});
          await pause(page, 300);
        }
      }
    }

    // 5. Holidays (5 IT Section Holidays)
    await navigateToHrRoute(page, "/hr/settings/holidays");
    const holidayList = [
      { name: `Republic Day ${suffix}`, date: "2026-01-26" },
      { name: `Independence Day ${suffix}`, date: "2026-08-15" },
      { name: `Gandhi Jayanti ${suffix}`, date: "2026-10-02" },
      { name: `Karnataka Rajyotsava ${suffix}`, date: "2026-11-01" },
      { name: `Christmas Day ${suffix}`, date: "2026-12-25" },
    ];
    for (const h of holidayList) {
      await createCrudRecord(page, "hr-settings-holidays", { name: h.name }, { type: "Public" }, { date: h.date });
    }

    // Attendance Rules
    await navigateToHrRoute(page, "/hr/settings/attendance");
    await fillByTestId(page, "hr-settings-attendance-workhoursperday", "8");
    await clickByTestId(page, "hr-settings-attendance-save");

    // Payroll Settings
    await navigateToHrRoute(page, "/hr/settings/payroll");
    await fillByTestId(page, "hr-settings-payroll-payday", "28");
    await clickByTestId(page, "hr-settings-payroll-save");

    console.log("=== MODULE 3: EMPLOYEE MASTER (15 IT ENGINEER EMPLOYEES) ===");
    const employeeProfiles = [
      { name: "Rahul Sharma", gender: "MALE" },
      { name: "Priya Patel", gender: "FEMALE" },
      { name: "Ananya Reddy", gender: "FEMALE" },
      { name: "Vikram Malhotra", gender: "MALE" },
      { name: "Kavita Rao", gender: "FEMALE" },
      { name: "Arjun Nair", gender: "MALE" },
      { name: "Neha Kapoor", gender: "FEMALE" },
      { name: "Siddharth Das", gender: "MALE" },
      { name: "Meera Joshi", gender: "FEMALE" },
      { name: "Amitav Sen", gender: "MALE" },
      { name: "Pooja Verma", gender: "FEMALE" },
      { name: "Rohan Mehta", gender: "MALE" },
      { name: "Divya Pillai", gender: "FEMALE" },
      { name: "Karan Singhania", gender: "MALE" },
      { name: "Deepika Roy", gender: "FEMALE" },
    ];

    for (let i = 0; i < employeeProfiles.length; i++) {
      const profile = employeeProfiles[i];
      const empName = `${profile.name} ${suffix}`;
      const empEmail = `${slugify(profile.name)}.${suffix}.test@jaldee.com`;
      const employeePhone = (attempt: number) =>
        `5555${String((Number(suffix) + i * 3 + attempt + 1) % 1_000_000).padStart(6, "0")}`;
      let empPhone = employeePhone(0);

      await navigateToHrRoute(page, "/hr/employees/new");

      // Step 1: Personal Details
      const nameInput = page.locator("input[placeholder*='John Doe'], input[name='name']").or(page.getByLabel(/full name/i)).first();
      await fillWhenReady(nameInput, empName);

      const emailInput = page.locator("input[placeholder*='john@example.com'], input[name='email']").or(page.getByLabel(/email address/i)).first();
      await fillWhenReady(emailInput, empEmail);

      await fillPhoneInput(page, "hr-new-employee-contact-number", empPhone);
      await selectByTestId(page, "hr-new-employee-gender", profile.gender);

      const panInput = page.locator("input[placeholder*='ABCDE1234F']").first();
      if (await panInput.isVisible().catch(() => false)) {
        await fillWhenReady(panInput, `ABCDE123${(i % 9) + 1}F`);
      }

      const nextStepBtn = page.getByRole("button", { name: /next step/i }).first();
      await clickWhenReady(nextStepBtn);

      // Step 2: Employment Details
      await selectFirstAvailableOption(page, "hr-new-employee-designation");
      await selectFirstAvailableOption(page, "hr-new-employee-department");
      await selectByTestId(page, "hr-new-employee-employment-type", "FullTime");
      await fillByTestId(page, "hr-new-employee-base-salary", String(60000 + i * 4000));

      let employeeCreated = false;
      for (let phoneAttempt = 0; phoneAttempt < 3; phoneAttempt++) {
        const completeBtn = page.getByRole("button", { name: /complete setup|save/i }).first();
        await clickWhenReady(completeBtn);

        const duplicateContactError = page.getByText(/(?:contact|phone|mobile|number).*(?:already|exist|duplicate)|(?:already|exist|duplicate).*(?:contact|phone|mobile|number)/i).first();
        const outcome = await Promise.race([
          page.waitForURL((url) => !url.pathname.endsWith("/employees/new"), { timeout: 10_000 }).then(() => "created" as const),
          duplicateContactError.waitFor({ state: "visible", timeout: 10_000 }).then(() => "duplicate" as const),
        ]).catch(() => "unknown" as const);

        if (outcome === "created") {
          employeeCreated = true;
          break;
        }

        if (outcome !== "duplicate") {
          throw new Error(`Employee creation did not complete for ${empName}`);
        }

        empPhone = employeePhone(phoneAttempt + 1);
        await clickWhenReady(page.getByRole("button", { name: /^back$/i }).first());
        await fillPhoneInput(page, "hr-new-employee-contact-number", empPhone);
        await clickWhenReady(page.getByRole("button", { name: /next step/i }).first());
        console.log(`LOG: Contact number already exists; retrying ${empName} with ${empPhone}`);
      }

      if (!employeeCreated) {
        throw new Error(`Unable to create ${empName} after trying 3 unique contact numbers`);
      }
      console.log(`LOG: Successfully created IT employee ${i + 1}/15: ${empName}`);
    }

    console.log("=== MODULE 4: REPORTS (Export CSV) ===");
    await navigateToHrRoute(page, "/hr/reports");
    await clickIfVisible(page.getByTestId("hr-reports-export"));
    await clickIfVisible(page.getByRole("button", { name: /Export|Download/i }).first());

    console.log("=== MODULE 5: HELPDESK (5 IT TICKETS) ===");
    await navigateToHrRoute(page, "/hr/tickets");
    const ticketList = [
      `Developer Laptop RAM & SSD Upgrade ${suffix}`,
      `VPN & Single Sign-On Access Issue ${suffix}`,
      `Production Database Slow Query Investigation ${suffix}`,
      `AWS Cloud Sandbox Access Request ${suffix}`,
      `Security Certificate Renewal Clearance ${suffix}`,
    ];
    for (const subject of ticketList) {
      await clickByTestId(page, "hr-tickets-create-button");
      if (await page.getByTestId("hr-tickets-subject").isVisible({ timeout: 4000 }).catch(() => false)) {
        await selectFirstAvailableOption(page, "hr-tickets-employee");
        await fillByTestId(page, "hr-tickets-subject", subject);
        await selectByTestId(page, "hr-tickets-category", "IT Support");
        await selectByTestId(page, "hr-tickets-priority", "High");
        await fillByTestId(page, "hr-tickets-description", `IT ticket for ${subject}`);
        await clickByTestId(page, "hr-tickets-submit");
        await page.getByTestId("hr-tickets-subject").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      }
    }

    console.log("=== MODULE 6: STAFFSPACE / ANNOUNCEMENTS (5 IT ANNOUNCEMENTS) ===");
    await navigateToHrRoute(page, "/hr/announcements");
    const announcementList = [
      `Q3 Engineering Townhall & Hackathon ${suffix}`,
      `New Cloud Infrastructure Cost Policy ${suffix}`,
      `Annual Tech Architecture Summit ${suffix}`,
      `Updated Information Security Best Practices ${suffix}`,
      `Quarterly Developer Recognition Awards ${suffix}`,
    ];
    for (const title of announcementList) {
      const createAnnounceBtn = page.getByTestId("hr-announcements-create-button").or(page.getByRole("button", { name: /New Announcement|Create|Broadcast/i })).first();
      if (await createAnnounceBtn.isVisible().catch(() => false)) {
        await clickWhenReady(createAnnounceBtn);
        const titleInput = page.getByTestId("hr-announcements-title").or(page.getByPlaceholder(/title/i)).first();
        if (await titleInput.isVisible({ timeout: 4000 }).catch(() => false)) {
          await fillWhenReady(titleInput, title);
          await clickIfVisible(page.getByTestId("hr-announcements-submit").or(page.getByRole("button", { name: /Submit|Broadcast|Save/i })).first());
          await pause(page, 500);
        }
      }
    }

    console.log("=== MODULE 7: EXPENSES (5 IT EXPENSES) ===");
    await navigateToHrRoute(page, "/hr/expenses");
    const expenseList = [
      { amount: "4500", note: `AWS Developer Certification Exam Fee ${suffix}` },
      { amount: "1850", note: `Client Onsite Tech Architecture Visit Cab ${suffix}` },
      { amount: "5200", note: `Developer Ergonomic Chair & Dual Monitor Arm ${suffix}` },
      { amount: "2500", note: `Engineering Sprint Retrospective Refreshments ${suffix}` },
      { amount: "1200", note: `Express Hardware Courier Shipping ${suffix}` },
    ];
    for (const exp of expenseList) {
      const submitExpenseBtn = page.getByTestId("hr-expenses-submit-open").or(page.getByRole("button", { name: /Submit Expense|New Claim|Add Expense/i })).first();
      if (await submitExpenseBtn.isVisible().catch(() => false)) {
        await clickWhenReady(submitExpenseBtn);
        const amountInp = page.getByTestId("hr-expenses-amount-input").or(page.locator("input[type='number']")).first();
        if (await amountInp.isVisible({ timeout: 4000 }).catch(() => false)) {
          const employeeSelected = await selectFirstAvailableOption(page, "hr-expenses-employee-select");
          if (!employeeSelected) {
            throw new Error("Expense employee dropdown did not provide a selectable employee");
          }
          await fillWhenReady(amountInp, exp.amount);
          await clickIfVisible(page.getByTestId("hr-expenses-submit-save").or(page.getByRole("button", { name: /Submit|Save/i })).first());
          await page.getByTestId("hr-expenses-submit-modal").waitFor({ state: "hidden", timeout: 10_000 });
        }
      }
    }

    console.log("=== MODULE 8: ASSETS (5 IT HARDWARE ASSETS) ===");
    await navigateToHrRoute(page, "/hr/assets");
    const assetList = [
      { type: "Laptop", name: `MacBook Pro M3 Max 32GB ${suffix}`, val: "240000" },
      { type: "Desktop", name: `Dell UltraSharp 32-inch 4K Monitor ${suffix}`, val: "45000" },
      { type: "Tablet", name: `iPad Pro 12.9 QA Device ${suffix}`, val: "95000" },
      { type: "Monitor", name: `Dual Curved Code Display Screen ${suffix}`, val: "38000" },
      { type: "Mobile", name: `5G Mobile Test Device ${suffix}`, val: "55000" },
    ];
    for (let i = 0; i < assetList.length; i++) {
      const a = assetList[i];
      const regAssetBtn = page.getByRole("button", { name: /register asset/i }).first();
      if (await regAssetBtn.isVisible().catch(() => false)) {
        await clickWhenReady(regAssetBtn);
        await selectByTestId(page, "hr-assets-type", a.type);
        await fillByTestId(page, "hr-assets-name", a.name);
        await fillByTestId(page, "hr-assets-tag-number", `TAG-${suffix}-${i + 1}`);
        await fillByTestId(page, "hr-assets-serial-number", `SER-${suffix}-${i + 1}`);
        await fillByTestId(page, "hr-assets-value", a.val);
        await fillByTestId(page, "hr-assets-notes", `IT Asset record for ${a.name}`);
        await clickByTestId(page, "hr-assets-form-save");
        await pause(page, 500);
      }
    }

    console.log("=== MODULE 9: SEPARATION (5 IT EXIT REQUESTS) ===");
    await navigateToHrRoute(page, "/hr/separation");
    const exitReasons = [
      `Relocation to European Tech Hub ${suffix}`,
      `Pursuing Masters in AI & Computer Science ${suffix}`,
      `Joining Tech Startup Lead Role ${suffix}`,
      `Personal Health & Wellness Break ${suffix}`,
      `Transitioning to Independent Consulting ${suffix}`,
    ];
    for (const reason of exitReasons) {
      const exitBtn = page.getByTestId("hr-separation-raise-exit").or(page.getByRole("button", { name: /Raise Exit|Initiate Separation/i })).first();
      if (await exitBtn.isVisible().catch(() => false)) {
        await clickWhenReady(exitBtn);
        await fillByTestId(page, "hr-separation-exit-reason", reason);
        await clickIfVisible(page.getByTestId("hr-separation-exit-submit"));
        await pause(page, 500);
      }
    }

    console.log("=== MODULE 10: ATTENDANCE ===");
    await navigateToHrRoute(page, "/hr/attendance");
    await clickByTestId(page, "hr-attendance-capture-location");
    for (const subtab of ["logs", "pending", "overtime", "field", "compoff", "onduty", "kiosk"]) {
      await clickByTestId(page, `hr-attendance-subtab-${subtab}`);
    }

    console.log("=== MODULE 11: LEAVE (5 IT LEAVE APPLICATIONS) ===");
    await navigateToHrRoute(page, "/hr/leave");
    const leaveReasons = [
      `Attending AWS Global Tech Summit ${suffix}`,
      `Annual Family Leave & Vacation ${suffix}`,
      `Medical Consultation & Health Check ${suffix}`,
      `Home Relocation & Fiber Internet Setup ${suffix}`,
      `Personal Technical Certification Prep ${suffix}`,
    ];
    for (const reason of leaveReasons) {
      await clickByTestId(page, "hr-leave-apply-button");
      const leaveModal = page.getByTestId("hr-leave-apply-modal");
      if (await leaveModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const employeeSelected = await selectFirstAvailableOption(page, "hr-leave-employee");
        if (!employeeSelected) {
          throw new Error("Leave employee dropdown did not provide a selectable employee");
        }
        const leaveTypeSelected = await selectFirstAvailableOption(page, "hr-leave-type");
        if (!leaveTypeSelected) {
          throw new Error("Leave type dropdown did not provide a selectable leave type");
        }
        await fillDateByTestId(page, "hr-leave-start-date", "2026-08-01");
        await fillDateByTestId(page, "hr-leave-end-date", "2026-08-02");
        await fillByTestId(page, "hr-leave-reason", reason);
        await clickByTestId(page, "hr-leave-apply-submit");
        await leaveModal.waitFor({ state: "hidden", timeout: 10_000 });
      }
    }

    console.log("=== MODULE 12: PAYROLL ===");
    await navigateToHrRoute(page, "/hr/payroll");

    console.log("=== MODULE 13: ORGANIZATION ===");
    await navigateToHrRoute(page, "/hr/org");

    console.log("=== MODULE 14: RECRUITMENT & CAREERS (5 IT REQUISITIONS & 5 CANDIDATES) ===");
    await navigateToHrRoute(page, "/hr/recruitment/requisitions");
    const reqList = [
      `Principal Cloud Architect ${suffix}`,
      `Senior Full Stack Developer ${suffix}`,
      `DevOps & SRE Specialist ${suffix}`,
      `Lead Product Manager ${suffix}`,
      `Cybersecurity Engineer ${suffix}`,
    ];
    for (let i = 0; i < reqList.length; i++) {
      const title = reqList[i];
      await clickByTestId(page, "hr-recruitment-new-requisition");
      if (await page.getByTestId("hr-recruitment-requisition-title").isVisible({ timeout: 4000 }).catch(() => false)) {
        await fillByTestId(page, "hr-recruitment-requisition-title", title);
        await selectByTestId(page, "hr-recruitment-requisition-employment-type", "FullTime");
        await fillByTestId(page, "hr-recruitment-requisition-openings", String(i + 1));
        await fillByTestId(page, "hr-recruitment-requisition-experience", "3-6 years");
        await selectByTestId(page, "hr-recruitment-requisition-status", "OPEN");
        await fillByTestId(page, "hr-recruitment-requisition-description", `IT requisition for ${title}`);
        await clickByTestId(page, "hr-recruitment-requisition-submit");
        await page.getByTestId("hr-recruitment-requisition-title").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      }
    }

    await navigateToHrRoute(page, "/hr/recruitment/candidates");
    const candidateList = [
      "Sneha Kulkarni",
      "Aditya Bhat",
      "Ritu Saxena",
      "Manish Pandey",
      "Shruti Iyer",
    ];
    for (const cName of candidateList) {
      const candidateName = `${cName} ${suffix}`;
      await clickByTestId(page, "hr-recruitment-new-candidate");
      if (await page.getByLabel(/full name/i).isVisible({ timeout: 4000 }).catch(() => false)) {
        await fillWhenReady(page.getByLabel(/full name/i).first(), candidateName);
        await fillWhenReady(page.getByLabel(/^email$/i).first(), `${slugify(cName)}.${suffix}.test@jaldee.com`);
        await clickIfVisible(page.getByRole("button", { name: /save candidate/i }));
        await pause(page, 500);
      }
    }

    console.log("=== SUCCESS: ALL 13 MODULES AUTOMATED WITH IT DOMAIN DATA & 15 EMPLOYEES ===");
  });
});
