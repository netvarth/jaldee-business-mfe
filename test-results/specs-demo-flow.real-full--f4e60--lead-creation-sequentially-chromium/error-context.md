# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\demo-flow.real.spec.ts >> full product demo flow with real APIs >> runs through signup, onboarding, and lead creation sequentially
- Location: automation\e2e\specs\demo-flow.real.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByTestId('signup-verify-otp-button')
Expected: enabled
Received: disabled

Call log:
  - Expect "toBeEnabled" with timeout 180000ms
  - waiting for getByTestId('signup-verify-otp-button')
    212 × locator resolved to <button disabled type="submit" id="signup-verify-otp-button" data-testid="signup-verify-otp-button" class="inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-0 bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)] active:…>Verify Code</button>
        - unexpected value "disabled"

```

```yaml
- button "Verify Code" [disabled]
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | const runRealApi = process.env.RUN_REAL_API_E2E === "1";
  4   | 
  5   | test.describe("full product demo flow with real APIs", () => {
  6   |   test.skip(!runRealApi, "Set RUN_REAL_API_E2E=1 to run this spec against the configured backend.");
  7   | 
  8   |   test("runs through signup, onboarding, and lead creation sequentially", async ({ page }) => {
  9   |     test.setTimeout(120000);
  10  | 
  11  |     const pause = async (ms = 800) => page.waitForTimeout(ms);
  12  |     const runId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  13  |     const firstName = `John${runId.slice(-4)}`;
  14  |     const lastName = `Doe${runId.slice(-3)}`;
  15  |     const loginId = `real.user.${runId}`;
  16  |     const businessName = `Real E2E Business ${runId}`;
  17  |     const email = `${runId}.test@jaldee.com`;
  18  |     const password = process.env.REAL_API_SIGNUP_PASSWORD ?? "Test@12345";
  19  |     const otp = process.env.REAL_API_SIGNUP_OTP;
  20  |     const locationName = `Main Clinic ${runId.slice(-5)}`;
  21  |     const address = `${runId.slice(-4)} Health Street, Suite ${runId.slice(-3)}`;
  22  |     const gstin = `32AAAAA${runId.slice(-4).padStart(4, "0")}A1Z5`;
  23  |     const templateName = `Real Lead Form ${runId}`;
  24  |     const pipelineName = `Real Standard Sales ${runId}`;
  25  |     const productName = `Real Membership ${runId}`;
  26  |     const channelName = `Real Website ${runId}`;
  27  |     const leadFirstName = `Lead${runId.slice(-4)}`;
  28  |     const leadLastName = `Contact${runId.slice(-3)}`;
  29  |     const leadEmail = `lead.${runId}.test@jaldee.com`;
  30  |     const leadCompany = `Doe Enterprises ${runId}`;
  31  | 
  32  |     await page.goto("/signup");
  33  |     await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");
  34  | 
  35  |     await page.getByTestId("signup-login-id-input").fill(loginId);
  36  |     await page.getByTestId("signup-tenant-name-input").fill(businessName);
  37  |     await page.getByTestId("signup-first-name-input").fill(firstName);
  38  |     await page.getByTestId("signup-last-name-input").fill(lastName);
  39  |     await page.getByTestId("signup-email-input").fill(email);
  40  |     await page.getByTestId("signup-password-input").fill(password);
  41  |     await page.getByTestId("signup-terms-checkbox").click();
  42  |     await page.getByTestId("signup-create-account-button").click();
  43  | 
  44  |     await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify", { timeout: 30000 });
  45  | 
  46  |     if (otp) {
  47  |       for (const [index, digit] of otp.slice(0, 6).split("").entries()) {
  48  |         await page.getByTestId(`signup-otp-input-digit-${index}`).fill(digit);
  49  |       }
  50  |     } else {
> 51  |       await expect(page.getByTestId("signup-verify-otp-button")).toBeEnabled({ timeout: 180000 });
      |                                                                  ^ Error: expect(locator).toBeEnabled() failed
  52  |     }
  53  |     await page.getByTestId("signup-verify-otp-button").click();
  54  | 
  55  |     try {
  56  |       await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: 10000 });
  57  |     } catch {
  58  |       await expect(page.getByText(/No refresh token available/i)).toBeVisible({ timeout: 5000 });
  59  |       await page.goto("/login");
  60  |       const loginInput = page.getByRole("textbox", { name: "Login ID" });
  61  |       await loginInput.fill(loginId);
  62  |       await page.getByRole("textbox", { name: "Password" }).fill(password);
  63  |       await page.getByRole("button", { name: "Sign in" }).click();
  64  |       if (await page.getByText(/User not found/i).isVisible({ timeout: 5000 }).catch(() => false)) {
  65  |         await loginInput.fill(email);
  66  |         await expect(loginInput).toHaveValue(email);
  67  |         await page.getByRole("button", { name: "Sign in" }).click();
  68  |       }
  69  |       await expect(page).toHaveURL(/\/(onboarding|jaldee-leads|dashboard)/, { timeout: 30000 });
  70  |       if (!page.url().includes("/onboarding")) {
  71  |         await page.goto("/onboarding");
  72  |       }
  73  |       await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: 30000 });
  74  |     }
  75  | 
  76  |     await page.getByTestId("onboarding-company-name-input").fill(businessName);
  77  |     await page.getByTestId("onboarding-gstin-input").fill(gstin);
  78  |     await page.getByTestId("onboarding-continue-button").click();
  79  | 
  80  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
  81  |     await page.getByTestId("onboarding-continue-button").click();
  82  | 
  83  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3");
  84  |     await page.getByTestId("onboarding-location-name-input").fill(locationName);
  85  |     await page.getByTestId("onboarding-pincode-input").fill("682001");
  86  |     await page.getByTestId("onboarding-full-address-textarea").fill(address);
  87  |     await page.getByTestId("onboarding-continue-button").click();
  88  | 
  89  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-4", { timeout: 30000 });
  90  |     await page.getByTestId("onboarding-go-to-dashboard-button").click();
  91  | 
  92  |     await page.goto("/jaldee-leads/templates");
  93  |     await expect(page.getByText("Lead Templates")).toBeVisible({ timeout: 30000 });
  94  |     await page.getByRole("button", { name: /New Template/i }).click();
  95  |     await page.getByTestId("jaldee-leads-template-builder-name-input").fill(templateName);
  96  |     await page.getByTestId("jaldee-leads-template-builder-save-button").click();
  97  |     await expect(page.getByText(templateName)).toBeVisible({ timeout: 30000 });
  98  | 
  99  |     await page.goto("/jaldee-leads/pipelines");
  100 |     await expect(page.getByText("Sales Pipelines")).toBeVisible({ timeout: 30000 });
  101 |     await page.getByRole("button", { name: /Create Pipeline/i }).click();
  102 |     await expect(page.getByRole("dialog")).toBeVisible();
  103 |     await page.getByLabel(/Pipeline Name/i).fill(pipelineName);
  104 |     await page.getByRole("button", { name: /Create & Configure/i, exact: true }).click();
  105 |     await expect(page.getByRole("button", { name: /Save Pipeline/i })).toBeVisible({ timeout: 30000 });
  106 |     await page.getByRole("button", { name: /Save Pipeline/i }).click();
  107 | 
  108 |     await page.goto("/jaldee-leads/products");
  109 |     await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 30000 });
  110 |     await page.getByTestId("jaldee-leads-new-product-button").click();
  111 |     await page.getByTestId("jaldee-leads-product-form-name-input").fill(productName);
  112 |     await page.getByTestId("jaldee-leads-product-form-pipeline-select").selectOption({ label: pipelineName });
  113 |     await page.getByTestId("jaldee-leads-product-form-save-button").click();
  114 |     await expect(page.getByTestId("jaldee-leads-products-page")).toBeVisible({ timeout: 30000 });
  115 | 
  116 |     await page.goto("/jaldee-leads/channels");
  117 |     await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 30000 });
  118 |     await page.getByTestId("jaldee-leads-register-channel-button").click();
  119 |     await page.getByLabel(/Channel \*/i).fill(channelName);
  120 |     await page.getByLabel(/Platform Type \*/i).selectOption({ label: "Direct" });
  121 |     await page.getByTestId("multi-combobox").click();
  122 |     await page.getByRole("option", { name: new RegExp(productName) }).click();
  123 |     await page.getByRole("button", { name: /Create Channel/i }).click();
  124 |     await expect(page.getByTestId("jaldee-leads-channels-page")).toBeVisible({ timeout: 30000 });
  125 | 
  126 |     await page.goto("/jaldee-leads/leads/create");
  127 |     await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: 30000 });
  128 |     await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill(leadFirstName);
  129 |     await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill(leadLastName);
  130 |     await page.getByTestId("jaldee-leads-create-lead-email-input").fill(leadEmail);
  131 |     await page.getByTestId("jaldee-leads-create-lead-company-input").fill(leadCompany);
  132 |     await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption({ label: productName });
  133 |     await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption({ label: channelName });
  134 |     await pause();
  135 |     await page.getByTestId("jaldee-leads-create-lead-save-button").click();
  136 | 
  137 |     await expect(page).toHaveURL(/\/jaldee-leads\/leads/, { timeout: 30000 });
  138 |   });
  139 | });
  140 | 
```