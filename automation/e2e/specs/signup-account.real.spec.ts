import { expect, test, type Locator, type Page } from "@playwright/test";

const runRealApi = process.env.RUN_REAL_API_E2E === "1";

const UI_TIMEOUT = 30_000;
const OTP_TIMEOUT = 10 * 60_000;
const TYPE_DELAY_MS = 60;
const POST_FILL_DELAY_MS = 300;
const POST_CLICK_DELAY_MS = 500;

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
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

async function completeOnboardingStepOne(page: Page, tenantName: string) {
  await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: OTP_TIMEOUT });
  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-1");

  await fillWhenReady(page.getByTestId("onboarding-company-name-input"), tenantName);
  await fillWhenReady(page.getByTestId("onboarding-gstin-input"), "32AAAAA0000A1Z5");
  await clickWhenReady(page.getByTestId("onboarding-continue-button"));

  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
}

async function completeOnboardingStepTwo(page: Page) {
  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
  await clickWhenReady(page.getByTestId("onboarding-continue-button"));
  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3", { timeout: UI_TIMEOUT });
}

async function completeOnboardingLocationStep(page: Page) {
  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3");
  await expect(page.getByTestId("onboarding-location-auto-detect-button")).toBeVisible({ timeout: UI_TIMEOUT });

  const origin = new URL(page.url()).origin;
  await page.context().grantPermissions(["geolocation"], { origin });
  await page.context().setGeolocation({ latitude: 10.5276, longitude: 76.2144, accuracy: 30 });

  await clickWhenReady(page.getByTestId("onboarding-location-auto-detect-button"));

  await expect
    .poll(async () => await page.getByTestId("onboarding-latitude-input").inputValue(), { timeout: UI_TIMEOUT })
    .not.toBe("");
  await expect
    .poll(async () => await page.getByTestId("onboarding-longitude-input").inputValue(), { timeout: UI_TIMEOUT })
    .not.toBe("");

  const locationName = page.getByTestId("onboarding-location-name-input");
  const pincode = page.getByTestId("onboarding-pincode-input");
  const address = page.getByTestId("onboarding-full-address-textarea");

  if (!(await locationName.inputValue()).trim()) {
    await fillWhenReady(locationName, "Main");
  }
  if (!(await pincode.inputValue()).trim()) {
    await fillWhenReady(pincode, "680001");
  }
  if (!(await address.inputValue()).trim()) {
    await fillWhenReady(address, "Thrissur, Kerala, India");
  }

  await clickWhenReady(page.getByTestId("onboarding-continue-button"));
  await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-4", { timeout: UI_TIMEOUT });
}

test.describe("real signup and onboarding", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runRealApi, "Set RUN_REAL_API_E2E=1 to run this spec against the configured backend.");

  test("creates a real account with email OTP and waits for manual verification", async ({ page }) => {
    test.setTimeout(20 * 60_000);

    const suffix = uniqueSuffix();
    const loginId = `hr${suffix}`;
    const tenantName = `HR E2E ${suffix}`;
    const email = `hr${suffix}.test@jaldee.com`;
    const password = process.env.REAL_API_SIGNUP_PASSWORD ?? "Test@12345";

    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");

    await fillWhenReady(page.getByTestId("signup-login-id-input"), loginId);
    await fillWhenReady(page.getByTestId("signup-tenant-name-input"), tenantName);
    await fillWhenReady(page.getByTestId("signup-first-name-input"), "HR");
    await fillWhenReady(page.getByTestId("signup-last-name-input"), "Automation");
    await fillWhenReady(page.getByTestId("signup-email-input"), email);
    await fillWhenReady(page.getByTestId("signup-password-input"), password);
    await clickWhenReady(page.getByTestId("signup-terms-checkbox"));
    await clickWhenReady(page.getByTestId("signup-create-account-button"));

    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify", { timeout: UI_TIMEOUT });

    console.log(`REAL SIGNUP OTP REQUIRED for ${email}`);
    console.log("Enter the OTP in the browser and click Verify Code. Automation will continue automatically.");

    await completeOnboardingStepOne(page, tenantName);
    await completeOnboardingStepTwo(page);
    await completeOnboardingLocationStep(page);
  });
});
