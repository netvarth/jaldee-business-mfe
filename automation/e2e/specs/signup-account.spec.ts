import { expect, test } from "@playwright/test";
import { mockShellAndLeadApis } from "../fixtures/jaldee-leads";

test.describe("signup and account setup", () => {
  test.beforeEach(async ({ page }) => {
    await mockShellAndLeadApis(page);
  });

  test("creates an account and reaches onboarding setup", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");

    await page.getByTestId("signup-login-id-input").fill("e2e-owner");
    await page.getByTestId("signup-first-name-input").fill("E2E");
    await page.getByTestId("signup-last-name-input").fill("Owner");
    await page.getByTestId("signup-email-input").fill("e2e.owner@example.com");
    await page.getByTestId("signup-password-input").fill("Test@12345");
    await page.getByTestId("signup-terms-checkbox").click();
    await page.getByTestId("signup-create-account-button").click();

    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify");

    for (const [index, digit] of ["1", "2", "3", "4", "5", "6"].entries()) {
      await page.getByTestId(`signup-otp-input-digit-${index}`).fill(digit);
    }
    await page.getByTestId("signup-verify-otp-button").click();

    await expect(page.getByTestId("onboarding-page")).toBeVisible();
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-1");

    await page.getByTestId("onboarding-company-name-input").fill("E2E Business");
    await page.getByTestId("onboarding-gstin-input").fill("32AAAAA0000A1Z5");
    await page.getByTestId("onboarding-continue-button").click();

    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
    await expect(page.getByTestId("onboarding-solution-health-button")).toHaveAttribute("data-active", "true");
  });
});
