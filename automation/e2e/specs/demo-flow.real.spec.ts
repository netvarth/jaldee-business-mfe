import { expect, test } from "@playwright/test";

const runRealApi = process.env.RUN_REAL_API_E2E === "1";

test.describe("full product demo flow with real APIs", () => {
  test.skip(!runRealApi, "Set RUN_REAL_API_E2E=1 to run this spec against the configured backend.");

  test("runs through signup, onboarding, and lead creation sequentially", async ({ page }) => {
    test.setTimeout(120000);

    const pause = async (ms = 800) => page.waitForTimeout(ms);
    const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const firstName = `John${runId.slice(-4)}`;
    const lastName = `Doe${runId.slice(-3)}`;
    const loginId = `real.user.${runId}`;
    const businessName = `Real E2E Business ${runId}`;
    const email = `${runId}.test@jaldee.com`;
    const password = process.env.REAL_API_SIGNUP_PASSWORD ?? "Test@12345";
    const otp = process.env.REAL_API_SIGNUP_OTP;
    const locationName = `Main Clinic ${runId.slice(-5)}`;
    const address = `${runId.slice(-4)} Health Street, Suite ${runId.slice(-3)}`;
    const gstin = `32AAAAA${runId.slice(-4).padStart(4, "0")}A1Z5`;
    const templateName = `Real Lead Form ${runId}`;
    const pipelineName = `Real Standard Sales ${runId}`;
    const productName = `Real Membership ${runId}`;
    const channelName = `Real Website ${runId}`;
    const leadFirstName = `Lead${runId.slice(-4)}`;
    const leadLastName = `Contact${runId.slice(-3)}`;
    const leadEmail = `lead.${runId}.test@jaldee.com`;
    const leadCompany = `Doe Enterprises ${runId}`;

    await page.goto("/signup");
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");

    await page.getByTestId("signup-login-id-input").fill(loginId);
    await page.getByTestId("signup-tenant-name-input").fill(businessName);
    await page.getByTestId("signup-first-name-input").fill(firstName);
    await page.getByTestId("signup-last-name-input").fill(lastName);
    await page.getByTestId("signup-email-input").fill(email);
    await page.getByTestId("signup-password-input").fill(password);
    await page.getByTestId("signup-terms-checkbox").click();
    await page.getByTestId("signup-create-account-button").click();

    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify", { timeout: 30000 });

    if (otp) {
      for (const [index, digit] of otp.slice(0, 6).split("").entries()) {
        await page.getByTestId(`signup-otp-input-digit-${index}`).fill(digit);
      }
    } else {
      await expect(page.getByTestId("signup-verify-otp-button")).toBeEnabled({ timeout: 180000 });
    }
    await page.getByTestId("signup-verify-otp-button").click();

    try {
      await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: 10000 });
    } catch {
      await expect(page.getByText(/No refresh token available/i)).toBeVisible({ timeout: 5000 });
      await page.goto("/login");
      const loginInput = page.getByRole("textbox", { name: "Login ID" });
      await loginInput.fill(loginId);
      await page.getByRole("textbox", { name: "Password" }).fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      if (await page.getByText(/User not found/i).isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginInput.fill(email);
        await expect(loginInput).toHaveValue(email);
        await page.getByRole("button", { name: "Sign in" }).click();
      }
      await expect(page).toHaveURL(/\/(onboarding|jaldee-leads|dashboard)/, { timeout: 30000 });
      if (!page.url().includes("/onboarding")) {
        await page.goto("/onboarding");
      }
      await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: 30000 });
    }

    await page.getByTestId("onboarding-company-name-input").fill(businessName);
    await page.getByTestId("onboarding-gstin-input").fill(gstin);
    await page.getByTestId("onboarding-continue-button").click();

    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
    await page.getByTestId("onboarding-continue-button").click();

    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3");
    await page.getByTestId("onboarding-location-name-input").fill(locationName);
    await page.getByTestId("onboarding-pincode-input").fill("682001");
    await page.getByTestId("onboarding-full-address-textarea").fill(address);
    await page.getByTestId("onboarding-continue-button").click();

    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-4", { timeout: 30000 });
    await page.getByTestId("onboarding-go-to-dashboard-button").click();

    await page.goto("/jaldee-leads/templates");
    await expect(page.getByText("Lead Templates")).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /New Template/i }).click();
    await page.getByTestId("jaldee-leads-template-builder-name-input").fill(templateName);
    await page.getByTestId("jaldee-leads-template-builder-save-button").click();
    await expect(page.getByText(templateName)).toBeVisible({ timeout: 30000 });

    await page.goto("/jaldee-leads/pipelines");
    await expect(page.getByText("Sales Pipelines")).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /Create Pipeline/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel(/Pipeline Name/i).fill(pipelineName);
    await page.getByRole("button", { name: /Create & Configure/i, exact: true }).click();
    await expect(page.getByRole("button", { name: /Save Pipeline/i })).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /Save Pipeline/i }).click();

    await page.goto("/jaldee-leads/products");
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("jaldee-leads-new-product-button").click();
    await page.getByTestId("jaldee-leads-product-form-name-input").fill(productName);
    await page.getByTestId("jaldee-leads-product-form-pipeline-select").selectOption({ label: pipelineName });
    await page.getByTestId("jaldee-leads-product-form-save-button").click();
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 30000 });

    await page.goto("/jaldee-leads/channels");
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("jaldee-leads-register-channel-button").click();
    await page.getByLabel(/Channel \*/i).fill(channelName);
    await page.getByLabel(/Platform Type \*/i).selectOption({ label: "Direct" });
    await page.getByTestId("multi-combobox").click();
    await page.getByRole("option", { name: new RegExp(productName) }).click();
    await page.getByRole("button", { name: /Create Channel/i }).click();
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 30000 });

    await page.goto("/jaldee-leads/leads/create");
    await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill(leadFirstName);
    await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill(leadLastName);
    await page.getByTestId("jaldee-leads-create-lead-email-input").fill(leadEmail);
    await page.getByTestId("jaldee-leads-create-lead-company-input").fill(leadCompany);
    await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption({ label: productName });
    await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption({ label: channelName });
    await pause();
    await page.getByTestId("jaldee-leads-create-lead-save-button").click();

    await expect(page).toHaveURL(/\/jaldee-leads\/leads/, { timeout: 30000 });
  });
});
