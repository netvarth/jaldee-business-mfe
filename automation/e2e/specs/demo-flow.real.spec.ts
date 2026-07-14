import { expect, test, type Locator, type Page } from "@playwright/test";

const runRealApi = process.env.RUN_REAL_API_E2E === "1";

const LOGIN_ID = process.env.REAL_API_LOGIN_ID ?? "jaldeesoft";
const PASSWORD = process.env.REAL_API_PASSWORD ?? "jaldeeSoft@1";

const UI_TIMEOUT = 30_000;
const SAVE_TIMEOUT = 60_000;
const LONG_TIMEOUT = 120_000;
const TYPE_DELAY_MS = 85;
const POST_CLICK_DELAY_MS = 700;
const POST_FILL_DELAY_MS = 500;

function randomSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-8);
}

async function pause(page: Page, ms = 700) {
  await page.waitForTimeout(ms);
}

async function clickWhenReady(target: Locator) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  await expect(target).toBeEnabled({ timeout: UI_TIMEOUT });
  await target.click();
  await target.page().waitForTimeout(POST_CLICK_DELAY_MS);
}

async function fillWhenReady(target: Locator, value: string) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  await target.click();
  await target.fill("");
  await target.pressSequentially(value, { delay: TYPE_DELAY_MS });
  await target.page().waitForTimeout(POST_FILL_DELAY_MS);
}

async function selectWhenReady(target: Locator, value: { label?: string; value?: string }) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  await target.selectOption(value);
  await target.page().waitForTimeout(POST_FILL_DELAY_MS);
}

async function fillIfVisible(target: Locator, value: string) {
  if (await target.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await target.click();
    await target.fill("");
    await target.pressSequentially(value, { delay: TYPE_DELAY_MS });
    await target.page().waitForTimeout(POST_FILL_DELAY_MS);
  }
}

async function selectOptionIfPresent(target: Locator, matcher: (label: string, value: string) => boolean) {
  await expect(target).toBeVisible({ timeout: UI_TIMEOUT });
  const options = await target.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node.textContent ?? "").trim(),
    })),
  );
  const match = options.find((option) => option.value && matcher(option.label, option.value));
  if (!match) {
    return false;
  }
  await target.selectOption(match.value);
  await target.page().waitForTimeout(POST_FILL_DELAY_MS);
  return true;
}

async function waitForAnyUrl(page: Page, patterns: RegExp[]) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < LONG_TIMEOUT) {
    const currentUrl = page.url();
    if (patterns.some((pattern) => pattern.test(currentUrl))) {
      return;
    }
    await page.waitForTimeout(300);
  }
  throw new Error(`Timed out waiting for expected URL. Current URL: ${page.url()}`);
}

async function loginToTenant(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await fillWhenReady(page.getByRole("textbox", { name: "Login ID" }), LOGIN_ID);
  await fillWhenReady(page.locator('input[type="password"]').first(), PASSWORD);
  await clickWhenReady(page.getByRole("button", { name: /^Sign in$/i }));

  await waitForAnyUrl(page, [/\/(home|health|leads\/dashboard|onboarding)$/]);

  if (/\/onboarding$/.test(page.url())) {
    await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: UI_TIMEOUT });
    if (await page.getByTestId("onboarding-skip-button").isVisible().catch(() => false)) {
      await clickWhenReady(page.getByTestId("onboarding-skip-button"));
      await waitForAnyUrl(page, [/\/(home|leads\/dashboard)$/]);
    }
  }
}

async function openLeadsDashboard(page: Page) {
  await page.goto("/leads/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("jaldee-leads-dashboard-page")).toBeVisible({ timeout: LONG_TIMEOUT });
}

test.describe("jaldee leads full real ui automation", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runRealApi, "Set RUN_REAL_API_E2E=1 to run this spec against the configured backend.");

  test("covers dashboard, templates, pipelines, products, channels, leads list, lead detail, and audit log", async ({ page }) => {
    test.setTimeout(10 * 60_000);

    const suffix = randomSuffix();
    const templateName = `Clinic Walk-in Enquiry ${suffix}`;
    const pipelineName = `New Patient Follow-up ${suffix}`;
    const pipelineStageName = `Doctor Callback ${suffix}`;
    const pipelineStageNameTwo = `Prescription Review ${suffix}`;
    const pipelineStageNameThree = `Insurance Approval ${suffix}`;
    const productName = `Dental Checkup Consultation ${suffix}`;
    const productDisplayName = `Dental Consultation ${suffix}`;
    const channelName = `WhatsApp Front Desk ${suffix}`;
    const leadFirstName = `Priya${suffix}`;
    const leadLastName = `Menon`;
    const leadEmail = `priya.menon.${suffix}.test@jaldee.com`;
    const leadPhone = `5555${suffix}`;
    const leadCompany = `Green Leaf Family Clinic ${suffix}`;
    const updatedLeadCompany = `Green Leaf Family Clinic OPD ${suffix}`;
    const leadNote = `Patient asked for evening appointment ${suffix}`;
    const leadValue = "3500";

    await loginToTenant(page);
    await openLeadsDashboard(page);

    await expect(page.getByTestId("jaldee-leads-dashboard-frequency-select")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-all-leads-button")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-quick-action-leads-button")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-quick-action-pipelines-button")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-quick-action-products-button")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-quick-action-channels-button")).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByTestId("jaldee-leads-dashboard-quick-action-audit-log-button")).toBeVisible({ timeout: UI_TIMEOUT });

    await page.goto("/leads/templates", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-templates-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-templates-create-button"));
    await expect(page.getByTestId("jaldee-leads-template-builder-page")).toBeVisible({ timeout: UI_TIMEOUT });
    await fillWhenReady(page.getByTestId("jaldee-leads-template-builder-name-input"), templateName);
    await fillWhenReady(page.getByTestId("jaldee-leads-template-builder-description-input"), `Daily clinic walk-in and WhatsApp enquiry form ${suffix}`);
    await clickWhenReady(page.getByTestId("jaldee-leads-template-builder-add-field-button"));
    await fillWhenReady(page.getByTestId("jaldee-leads-template-builder-add-field-json-key-input"), `patientName${suffix}`);
    await fillWhenReady(page.getByTestId("jaldee-leads-template-builder-add-field-title-input"), `Patient name ${suffix}`);
    await fillWhenReady(page.getByTestId("jaldee-leads-template-builder-add-field-description-input"), "Name captured by front desk staff");
    await clickWhenReady(page.getByTestId("jaldee-leads-template-builder-add-field-required-checkbox"));
    await clickWhenReady(page.getByTestId("jaldee-leads-template-builder-add-item-confirm-button"));
    await clickWhenReady(page.getByTestId("jaldee-leads-template-builder-save-button"));
    await expect(page.getByTestId("jaldee-leads-templates-page")).toBeVisible({ timeout: SAVE_TIMEOUT });
    await expect(page.getByText(templateName)).toBeVisible({ timeout: SAVE_TIMEOUT });

    await page.goto("/leads/pipelines", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-pipelines-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-pipelines-create-button"));
    await fillWhenReady(page.getByLabel(/Pipeline Name/i), pipelineName);
    await fillWhenReady(page.getByLabel(/Objectives/i), `Lead qualification pipeline ${suffix}`);
    await clickWhenReady(page.getByRole("button", { name: /Create & Configure/i }));
    await expect(page.getByText(new RegExp(`Configure Pipeline: ${pipelineName}`))).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }));
    await fillWhenReady(page.getByLabel(/^Stage Name \*/i), pipelineStageName);
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }).last());
    await expect(page.getByText(pipelineStageName)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }));
    await fillWhenReady(page.getByLabel(/^Stage Name \*/i), pipelineStageNameTwo);
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }).last());
    await expect(page.getByText(pipelineStageNameTwo)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }));
    await fillWhenReady(page.getByLabel(/^Stage Name \*/i), pipelineStageNameThree);
    await clickWhenReady(page.getByRole("button", { name: /^Add Stage$/i }).last());
    await expect(page.getByText(pipelineStageNameThree)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByRole("button", { name: /^Save Pipeline$/i }));
    await expect(page.getByTestId("jaldee-leads-pipelines-page")).toBeVisible({ timeout: SAVE_TIMEOUT });
    await expect(page.getByText(pipelineName)).toBeVisible({ timeout: SAVE_TIMEOUT });

    await page.goto("/leads/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-new-product-button"));
    await expect(page.getByTestId("jaldee-leads-create-product-page")).toBeVisible({ timeout: UI_TIMEOUT });
    await fillWhenReady(page.getByTestId("jaldee-leads-product-form-name-input"), productName);
    await fillWhenReady(page.getByTestId("jaldee-leads-product-form-display-name-input"), productDisplayName);
    await selectWhenReady(page.getByTestId("jaldee-leads-product-form-pipeline-select"), { label: pipelineName });
    await clickWhenReady(page.getByTestId("jaldee-leads-product-form-save-button"));
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: SAVE_TIMEOUT });
    await expect(page.getByText(productName)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByText(productName));
    await expect(page.locator("[data-testid^='jaldee-leads-product-'][data-testid$='-detail-page']")).toBeVisible({ timeout: SAVE_TIMEOUT });

    await page.goto("/leads/channels", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-register-channel-button"));
    await fillWhenReady(page.getByLabel(/^Channel \*/i), channelName);
    await selectWhenReady(page.getByLabel(/^Platform Type \*/i), { label: "Direct" });
    await clickWhenReady(page.getByTestId("multi-combobox"));
    await clickWhenReady(page.getByRole("option", { name: new RegExp(productName) }));
    await page.keyboard.press("Escape");
    await pause(page, 600);
    await clickWhenReady(page.getByRole("button", { name: /^Create Channel$/i }));
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: SAVE_TIMEOUT });
    await expect(page.getByText(channelName)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByText(channelName));
    await expect(page.locator("[data-testid^='jaldee-leads-channel-'][data-testid$='-detail-page']")).toBeVisible({ timeout: SAVE_TIMEOUT });

    await page.goto("/leads/list/create", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await fillWhenReady(page.getByTestId("jaldee-leads-create-lead-first-name-input"), leadFirstName);
    await fillWhenReady(page.getByTestId("jaldee-leads-create-lead-last-name-input"), leadLastName);
    await fillWhenReady(page.getByTestId("jaldee-leads-create-lead-email-input"), leadEmail);
    await fillIfVisible(page.getByTestId("jaldee-leads-create-lead-phone-input"), leadPhone);
    await fillIfVisible(page.getByRole("textbox", { name: "Mobile Bridge" }), leadPhone);
    await fillWhenReady(page.getByTestId("jaldee-leads-create-lead-company-input"), leadCompany);
    await selectWhenReady(page.getByTestId("jaldee-leads-create-lead-product-select"), { label: productName });
    await pause(page, 1000);
    await expect(page.getByTestId("jaldee-leads-create-lead-channel-select")).toBeEnabled({ timeout: SAVE_TIMEOUT });
    await selectWhenReady(page.getByTestId("jaldee-leads-create-lead-channel-select"), { label: channelName });
    await clickWhenReady(page.getByTestId("jaldee-leads-create-lead-priority-high-button"));
    await fillIfVisible(page.getByTestId("jaldee-leads-create-lead-expected-value-input"), leadValue);
    await pause(page, 1000);
    await clickWhenReady(page.getByTestId("jaldee-leads-create-lead-save-button"));

    await expect(page.getByTestId("jaldee-leads-list-page")).toBeVisible({ timeout: SAVE_TIMEOUT });
    await expect(page.getByText(leadFirstName)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-list-filter-button"));
    await expect(page.getByTestId("jaldee-leads-list-filter-panel")).toBeVisible({ timeout: UI_TIMEOUT });
    await selectWhenReady(page.getByTestId("jaldee-leads-list-priority-filter"), { value: "HIGH" });
    await clickWhenReady(page.getByTestId("jaldee-leads-list-filter-apply-button"));
    await expect(page.getByText(leadFirstName)).toBeVisible({ timeout: SAVE_TIMEOUT });
    await fillWhenReady(page.getByPlaceholder("Search leads..."), suffix);
    await pause(page, 1800);
    await clickWhenReady(page.getByText(leadFirstName));

    const leadDetailPage = page.locator("[data-testid^='jaldee-leads-lead-'][data-testid$='-detail-page']");
    await expect(leadDetailPage).toBeVisible({ timeout: SAVE_TIMEOUT });
    const requiredTaskRow = page.locator("[data-testid*='-required-task-'][data-testid$='-row']").first();
    if (await requiredTaskRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(requiredTaskRow).toBeVisible({ timeout: UI_TIMEOUT });
    }

    await clickWhenReady(page.getByRole("button", { name: /^Advance Stage$/i }));
    const destinationStageSelect = page.getByLabel("Select Destination Stage");
    const movedToCreatedStage = await selectOptionIfPresent(
      destinationStageSelect,
      (label) => label.includes(pipelineStageNameTwo.toUpperCase()),
    );
    if (!movedToCreatedStage) {
      await selectOptionIfPresent(destinationStageSelect, (_label, value) => value !== "");
    }
    await clickWhenReady(page.getByRole("button", { name: /^Confirm Transition$/i }));
    await expect
      .poll(
        async () => await page.locator("body").innerText(),
        { timeout: SAVE_TIMEOUT },
      )
      .toContain(pipelineStageNameTwo);

    await clickWhenReady(page.getByRole("button", { name: /^Edit$/i }));
    const contactSectionInputs = page
      .locator("section, div")
      .filter({ has: page.getByText("Contact dossier") })
      .locator('input[type="text"], input[type="email"], input:not([type])');
    await fillWhenReady(contactSectionInputs.nth(2), updatedLeadCompany);
    await clickWhenReady(page.getByRole("button", { name: /^Save$/i }));
    await expect(page.getByRole("button", { name: /^Edit$/i })).toBeVisible({ timeout: SAVE_TIMEOUT });

    const noteArea = page.locator("[data-testid$='-note-textarea']").first();
    if (await noteArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fillWhenReady(noteArea, leadNote);
      await clickWhenReady(page.locator("[data-testid$='-commit-note-button']").first());
      await pause(page, 1500);
    }

    await page.goto("/leads/audit-log", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("jaldee-leads-audit-log-page")).toBeVisible({ timeout: LONG_TIMEOUT });
    await clickWhenReady(page.getByTestId("jaldee-leads-audit-log-filter-button"));
    await expect(page.getByTestId("jaldee-leads-audit-log-drawer-action-filter")).toBeVisible({ timeout: UI_TIMEOUT });
    await fillWhenReady(page.getByTestId("jaldee-leads-audit-log-drawer-action-filter"), "lead");
    await clickWhenReady(page.getByRole("button", { name: /^Apply Filters$/i }));
    await expect(page.getByTestId("jaldee-leads-audit-log-table")).toBeVisible({ timeout: UI_TIMEOUT });
  });
});
