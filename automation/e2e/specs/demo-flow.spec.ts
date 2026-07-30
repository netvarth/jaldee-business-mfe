import { expect, test } from "@playwright/test";

test.describe("full product demo flow", () => {
  // We use serial so that if we ever want to break this into multiple tests
  // they run one after another, but here we just put it in one big test
  // for a seamless visual flow.

  // NOTE: We removed the mockShellAndLeadApis(page) call here so the test hits your REAL backend!

  test("runs through signup, onboarding, and lead creation sequentially", async ({ page }) => {
    test.setTimeout(10 * 60_000);
    page.on("response", response => {
      if (response.url().includes("/v1/api/")) {
        console.log(`[REST API] ${response.request().method()} ${response.url()} -> ${response.status()} ${response.statusText()}`);
      }
    });
    page.on("pageerror", error => console.error(`[PAGE ERROR] ${error.message}`));

    // A small helper to slow down the demo so the user can watch the magic happen
    const pause = async (ms = 800) => await page.waitForTimeout(ms);

    // 1. Signup
    const timestamp = Date.now();
    const signupPhone = `5555${String(timestamp).slice(-6)}`;
    const businessName = `Leads Automation ${timestamp}`;
    const templateName = `Lead Form ${timestamp}`;
    const pipelineName = `Sales Pipeline ${timestamp}`;
    const productName = `Membership ${timestamp}`;
    const channelName = `Website ${timestamp}`;
    await page.goto("/signup");
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");

    await page.getByTestId("signup-login-id-input").fill(`john.doe.${timestamp}`);
    await page.getByTestId("signup-tenant-name-input").fill(businessName);
    await page.getByTestId("signup-first-name-input").fill(`John${timestamp}`);
    await page.getByTestId("signup-last-name-input").fill("Doe");
    await page.getByTestId("signup-mobile-input-number").fill(signupPhone);
    await page.getByTestId("signup-password-input").fill("Test@12345");
    await page.getByTestId("signup-terms-checkbox").click();
    await pause();
    await page.getByTestId("signup-create-account-button").click();

    // 2. OTP Verification
    await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify");

    // The backend reserves 5555 test numbers for the fixed verification OTP.
    for (const [index, digit] of ["5", "5", "5", "5", "5", "5"].entries()) {
      await page.getByTestId(`signup-otp-input-digit-${index}`).fill(digit);
    }
    await pause();
    await page.getByTestId("signup-verify-otp-button").click();

    await expect(page.getByTestId("onboarding-page")).toBeVisible();
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-1");
    await page.getByTestId("onboarding-company-name-input").fill(businessName);
    await page.getByTestId("onboarding-gstin-input").fill("32AAAAA0000A1Z5");
    await page.getByTestId("onboarding-business-phone-input-number").fill(signupPhone);
    await pause();
    await page.getByTestId("onboarding-continue-button").click();

    // 4. Onboarding - Solutions
    await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
    for (const solutionId of ["health", "bookings", "karty", "lending", "hr", "finance"]) {
      const solution = page.getByTestId(`onboarding-solution-${solutionId}-button`);
      const shouldBeSelected = solutionId === "health" || solutionId === "finance";
      const isSelected = await solution.getAttribute("data-active") === "true";
      if (isSelected !== shouldBeSelected) {
        await solution.click();
      }
    }
    await expect(page.getByTestId("onboarding-solution-health-button")).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId("onboarding-solution-finance-button")).toHaveAttribute("data-active", "true");
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

    // 7. Enable Jaldee Leads from Settings > Subscription & Products
    await page.goto("/settings/subscriptions", { waitUntil: "domcontentloaded" });
    const leadsSwitch = page.getByTestId("settings-product-leads-switch");
    await expect(leadsSwitch).toBeVisible({ timeout: 30_000 });
    if (await leadsSwitch.getAttribute("aria-checked") !== "true") {
      await leadsSwitch.click();
    }
    await expect(leadsSwitch).toHaveAttribute("aria-checked", "true");

    const settingsSaveResponse = page.waitForResponse(
      response =>
        response.request().method() === "PUT" &&
        response.url().includes("/base-service/v1/api/tenant/settings"),
      { timeout: 30_000 },
    );
    const settingsSaveButton = page.getByTestId("settings-save-button");
    await settingsSaveButton.click();
    const savedSettings = await settingsSaveResponse;
    expect(savedSettings.ok(), await savedSettings.text()).toBeTruthy();
    await expect(settingsSaveButton).toHaveText(/Save Changes/i, { timeout: 30_000 });
    await expect(settingsSaveButton).toBeEnabled({ timeout: 30_000 });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = window.localStorage.getItem("jaldee-shell-store");
            if (!raw) return false;
            try {
              const parsed = JSON.parse(raw);
              return parsed?.state?.account?.enabledModules?.includes("leads") === true;
            } catch {
              return false;
            }
          }),
        { timeout: 30_000, message: "Leads module was not applied to the shell account after saving subscriptions" },
      )
      .toBe(true);

    await page.getByTestId("icon-rail-item-basecrm").click();
    await expect(page.getByTestId("sidebar-item-basecrm-leads")).toBeVisible({ timeout: 30_000 });

    // 8. Navigate to Templates & Create Template
    await page.goto("/leads/templates");
    await expect(page.getByTestId("jaldee-leads-templates-page")).toBeVisible({ timeout: 30_000 });
    await pause();
    await page.getByRole("button", { name: /New Template/i }).click();
    await expect(page.getByTestId("jaldee-leads-template-builder-name-input")).toBeVisible();
    await page.getByTestId("jaldee-leads-template-builder-name-input").fill(templateName);
    await page.getByTestId("jaldee-leads-template-builder-save-button").click();
    await expect(page.getByText(templateName)).toBeVisible();
    await pause();

    // 8. Navigate to Pipelines & Create Pipeline
    await page.goto("/leads/pipelines");
    await expect(page.getByText("Sales Pipelines")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByRole("button", { name: /Create Pipeline/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel(/Pipeline Name/i).fill(pipelineName);
    await page.getByRole("button", { name: /Create & Configure/i, exact: true }).click();
    await pause();
    // Wait for PipelineBuilder to load (it fetches pipeline detail after dialog)
    await expect(page.getByRole("button", { name: /Save Pipeline/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Save Pipeline/i }).click();
    await pause();

    // 9. Navigate to Products & Create Product
    await page.goto("/leads/products");
    await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByRole("button", { name: /New Product/i }).click();
    await expect(page.getByTestId("jaldee-leads-product-form-name-input")).toBeVisible();
    await page.getByTestId("jaldee-leads-product-form-name-input").fill(productName);
    await page.getByTestId("jaldee-leads-product-form-pipeline-select").selectOption({ label: pipelineName });
    await page.getByTestId("jaldee-leads-product-form-save-button").click();
    await pause();

    // 10. Navigate to Channels & Create Channel
    await page.goto("/leads/channels");
    await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 15000 });
    await pause();
    await page.getByTestId("jaldee-leads-register-channel-button").click();
    await page.getByLabel(/Channel \*/i).fill(channelName);
    await page.getByLabel(/Platform Type \*/i).selectOption({ label: "Direct" });
    await page.getByRole("button", { name: /Create Channel/i }).click();
    await pause();

    // 11. Navigate to Lead Creation
    await page.goto("/leads/list/create");
    await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: 15000 });
    await pause();

    // 12. Create Lead
    await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill("John");
    await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill("Doe");
    await page.getByTestId("jaldee-leads-create-lead-email-input").fill("john.doe.lead@example.com");
    await page.getByTestId("jaldee-leads-create-lead-company-input").fill("Doe Enterprises");
    await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption({ label: productName });
    await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption({ label: channelName });
    await pause();
    await page.getByTestId("jaldee-leads-create-lead-save-button").click();

    // 13. Verify Lead created and navigated to Leads list
    await expect(page).toHaveURL(/\/leads\/list/);
    await pause(3000); // Leave it on screen for a moment at the end!
  });
});
