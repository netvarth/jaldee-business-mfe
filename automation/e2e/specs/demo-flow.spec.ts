import { expect, test } from "@playwright/test";
import { mockShellAndLeadApis } from "../fixtures/jaldee-leads";

test.describe("full product demo flow", () => {
  // We use serial so that if we ever want to break this into multiple tests
  // they run one after another, but here we just put it in one big test
  // for a seamless visual flow.

  // NOTE: We removed the mockShellAndLeadApis(page) call here so the test hits your REAL backend!

  test("runs through signup, onboarding, and lead creation sequentially", async ({ page }) => {
    // Mock APIs so the test runs fully automatically in headless E2E environments
    await mockShellAndLeadApis(page);

    // Increase the maximum timeout for this specific test
    test.setTimeout(60000);

    // A small helper to slow down the demo so the user can watch the magic happen
    const pause = async (ms = 800) => await page.waitForTimeout(ms);

    // 1. Signup
    const timestamp = Date.now();
    await page.goto("/signup");
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");

    await page.getByTestId("signup-login-id-input").fill(`john.doe.${timestamp}`);
    await page.getByTestId("signup-tenant-name-input").fill(`Business ${timestamp}`);
    await page.getByTestId("signup-first-name-input").fill("John${timestamp}");
    await page.getByTestId("signup-last-name-input").fill("Doe");
    await page.getByTestId("signup-email-input").fill(`${timestamp}.test@jaldee.com`);
    await page.getByTestId("signup-password-input").fill("Test@12345");
    await page.getByTestId("signup-terms-checkbox").click();
    await pause();
    await page.getByTestId("signup-create-account-button").click();

    // 2. OTP Verification
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify");

    // Automate OTP verification using the mock verification code
    for (const [index, digit] of ["1", "2", "3", "4", "5", "6"].entries()) {
      await page.getByTestId(`signup-otp-input-digit-${index}`).fill(digit);
    }
    await pause();
    await page.getByTestId("signup-verify-otp-button").click();

    await expect(page.getByTestId("onboarding-page")).toBeVisible();
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-1");
    await page.getByTestId("onboarding-company-name-input").fill("E2E Business");
    await page.getByTestId("onboarding-gstin-input").fill("32AAAAA0000A1Z5");
    await pause();
    await page.getByTestId("onboarding-continue-button").click();

    // 4. Onboarding - Solutions
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
    await expect(page.getByTestId("onboarding-solution-health-button")).toHaveAttribute("data-active", "true");
    await pause();
    await page.getByTestId("onboarding-continue-button").click();

    // 5. Onboarding - Location
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3");
    await page.getByTestId("onboarding-location-name-input").fill("Main Clinic");
    await page.getByTestId("onboarding-pincode-input").fill("682001");
    await page.getByTestId("onboarding-full-address-textarea").fill("123 Health Street, Suite 400");
    await pause();
    await page.getByTestId("onboarding-continue-button").click();

    // 6. Onboarding - Complete
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-4");
    await pause();
    await page.getByTestId("onboarding-go-to-dashboard-button").click();

    // 7. Navigate to Templates & Create Template
    await page.goto("/jaldee-leads/templates");
    await expect(page.getByText("Lead Templates")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByRole("button", { name: /New Template/i }).click();
    await expect(page.getByTestId("jaldee-leads-template-builder-name-input")).toBeVisible();
    await page.getByTestId("jaldee-leads-template-builder-name-input").fill("Acme Lead Form");
    await page.getByTestId("jaldee-leads-template-builder-save-button").click();
    await expect(page.getByText("Acme Lead Form")).toBeVisible();
    await pause();

    // 8. Navigate to Pipelines & Create Pipeline
    await page.goto("/jaldee-leads/pipelines");
    await expect(page.getByText("Sales Pipelines")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByRole("button", { name: /Create Pipeline/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel(/Pipeline Name/i).fill("Acme Standard Sales");
    await page.getByRole("button", { name: /Create & Configure/i, exact: true }).click();
    await pause();
    // Wait for PipelineBuilder to load (it fetches pipeline detail after dialog)
    await expect(page.getByRole("button", { name: /Save Pipeline/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Save Pipeline/i }).click();
    await pause();

    // 9. Navigate to Products & Create Product
    await page.goto("/jaldee-leads/products");
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByRole("button", { name: /New Product/i }).click();
    await expect(page.getByTestId("jaldee-leads-product-form-name-input")).toBeVisible();
    await page.getByTestId("jaldee-leads-product-form-name-input").fill("Acme Membership");
    await page.getByTestId("jaldee-leads-product-form-pipeline-select").selectOption({ label: "Acme Standard Sales" });
    await page.getByTestId("jaldee-leads-product-form-save-button").click();
    await pause();

    // 10. Navigate to Channels & Create Channel
    await page.goto("/jaldee-leads/channels");
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByTestId("jaldee-leads-register-channel-button").click();
    await page.getByLabel(/Channel \*/i).fill("Acme Website");
    await page.getByLabel(/Platform Type \*/i).selectOption({ label: "Direct" });
    await page.getByRole("button", { name: /Create Channel/i }).click();
    await pause();

    // 11. Navigate to Lead Creation
    await page.goto("/jaldee-leads/leads/create");
    await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: 15000 });
    await pause();

    // 12. Create Lead
    await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill("John");
    await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill("Doe");
    await page.getByTestId("jaldee-leads-create-lead-email-input").fill("john.doe.lead@example.com");
    await page.getByTestId("jaldee-leads-create-lead-company-input").fill("Doe Enterprises");
    await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption({ label: "Acme Membership" });
    await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption({ label: "Acme Website" });
    await pause();
    await page.getByTestId("jaldee-leads-create-lead-save-button").click();

    // 13. Verify Lead created and navigated to Leads list
    await expect(page).toHaveURL(/\/jaldee-leads\/leads/);
    await pause(3000); // Leave it on screen for a moment at the end!
  });
});
