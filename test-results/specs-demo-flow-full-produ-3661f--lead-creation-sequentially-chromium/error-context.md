# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\demo-flow.spec.ts >> full product demo flow >> runs through signup, onboarding, and lead creation sequentially
- Location: automation\e2e\specs\demo-flow.spec.ts:11:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('onboarding-page')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 280000ms
  - waiting for getByTestId('onboarding-page')

```

```yaml
- button "Back to Sign Up"
- img
- heading "Verify your identity" [level=1]
- paragraph: We've sent a 6-digit code to 1***@jaldee.com. Please enter it below to continue.
- textbox "OTP digit 1": "7"
- textbox "OTP digit 2": "4"
- textbox "OTP digit 3": "2"
- textbox "OTP digit 4": "2"
- textbox "OTP digit 5": "7"
- textbox "OTP digit 6": "1"
- text: Request failed with status code 500
- button "Verify Code"
- text: Expires in 4:06 Resend in 0:06
- button "Resend OTP" [disabled]
- complementary:
  - heading "One platform for everything your business needs" [level=2]
  - paragraph: From bookings to billing, inventory to invoices, Jaldee gives Indian businesses the complete operating system they've been missing.
  - text: ◫ Bookings & scheduling Let customers book online, 24/7 ₹ GST-compliant invoicing Built for Indian businesses ↗ Grow with insights Reports and analytics included TRUSTED BY 2,500+ INDIAN BUSINESSES Acme Healthcare · Karty Stores · Lino Lending · Prasis Clinic
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { mockShellAndLeadApis } from "../fixtures/jaldee-leads";
  3   | 
  4   | test.describe("full product demo flow", () => {
  5   |   // We use serial so that if we ever want to break this into multiple tests
  6   |   // they run one after another, but here we just put it in one big test
  7   |   // for a seamless visual flow.
  8   | 
  9   |   // NOTE: We removed the mockShellAndLeadApis(page) call here so the test hits your REAL backend!
  10  | 
  11  |   test("runs through signup, onboarding, and lead creation sequentially", async ({ page }) => {
  12  |     // Increase the maximum timeout for this specific test to 5 minutes (300,000 ms)
  13  |     // so you have plenty of time to read your email and enter the OTP!
  14  |     test.setTimeout(300000);
  15  | 
  16  |     // A small helper to slow down the demo so the user can watch the magic happen
  17  |     const pause = async (ms = 800) => await page.waitForTimeout(ms);
  18  | 
  19  |     // 1. Signup
  20  |     const timestamp = Date.now();
  21  |     await page.goto("/signup");
  22  |     await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "details");
  23  | 
  24  |     await page.getByTestId("signup-login-id-input").fill(`john.doe.${timestamp}`);
  25  |     await page.getByTestId("signup-first-name-input").fill("John${timestamp}");
  26  |     await page.getByTestId("signup-last-name-input").fill("Doe");
  27  |     await page.getByTestId("signup-email-input").fill(`${timestamp}.test@jaldee.com`);
  28  |     await page.getByTestId("signup-password-input").fill("Test@12345");
  29  |     await page.getByTestId("signup-terms-checkbox").click();
  30  |     await pause();
  31  |     await page.getByTestId("signup-create-account-button").click();
  32  | 
  33  |     // 2. OTP Verification
  34  |     await expect(page.getByTestId("signup-page")).toHaveAttribute("data-state", "verify");
  35  | 
  36  |     console.log("WAITING FOR MANUAL OTP ENTRY: Please check your email/phone and enter the OTP in the browser. You have up to 5 minutes.");
  37  |     // Wait for the user to manually enter the OTP and click "Verify".
  38  |     // The script will automatically resume once the Onboarding page becomes visible.
> 39  |     await expect(page.getByTestId("onboarding-page")).toBeVisible({ timeout: 280000 });
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  40  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-1");
  41  |     await page.getByTestId("onboarding-company-name-input").fill("E2E Business");
  42  |     await page.getByTestId("onboarding-gstin-input").fill("32AAAAA0000A1Z5");
  43  |     await pause();
  44  |     await page.getByTestId("onboarding-continue-button").click();
  45  | 
  46  |     // 4. Onboarding - Solutions
  47  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-2");
  48  |     await expect(page.getByTestId("onboarding-solution-health-button")).toHaveAttribute("data-active", "true");
  49  |     await pause();
  50  |     await page.getByTestId("onboarding-continue-button").click();
  51  | 
  52  |     // 5. Onboarding - Location
  53  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-3");
  54  |     await page.getByTestId("onboarding-location-name-input").fill("Main Clinic");
  55  |     await page.getByTestId("onboarding-pincode-input").fill("682001");
  56  |     await page.getByTestId("onboarding-full-address-textarea").fill("123 Health Street, Suite 400");
  57  |     await pause();
  58  |     await page.getByTestId("onboarding-continue-button").click();
  59  | 
  60  |     // 6. Onboarding - Complete
  61  |     await expect(page.getByTestId("onboarding-page")).toHaveAttribute("data-state", "step-4");
  62  |     await pause();
  63  |     await page.getByTestId("onboarding-go-to-dashboard-button").click();
  64  | 
  65  |     // 7. Navigate to Templates & Create Template
  66  |     await page.goto("/jaldee-leads/templates");
  67  |     await expect(page.getByText("Lead Templates")).toBeVisible({ timeout: 15000 });
  68  |     await pause();
  69  |     await page.getByRole("button", { name: /New Template/i }).click();
  70  |     await expect(page.getByTestId("jaldee-leads-template-builder-name-input")).toBeVisible();
  71  |     await page.getByTestId("jaldee-leads-template-builder-name-input").fill("Acme Lead Form");
  72  |     await page.getByTestId("jaldee-leads-template-builder-save-button").click();
  73  |     await expect(page.getByText(/Template created/i)).toBeVisible();
  74  |     await pause();
  75  | 
  76  |     // 8. Navigate to Pipelines & Create Pipeline
  77  |     await page.goto("/jaldee-leads/pipelines");
  78  |     await expect(page.getByText("Sales Pipelines")).toBeVisible({ timeout: 15000 });
  79  |     await pause();
  80  |     await page.getByRole("button", { name: /Create Pipeline/i }).click();
  81  |     await expect(page.getByRole("dialog")).toBeVisible();
  82  |     await page.getByLabel(/Pipeline Name/i).fill("Acme Standard Sales");
  83  |     await page.getByRole("button", { name: /Create Pipeline/i, exact: true }).click();
  84  |     await pause();
  85  |     await page.getByRole("button", { name: /Save Pipeline/i }).click();
  86  |     await pause();
  87  | 
  88  |     // 9. Navigate to Products & Create Product
  89  |     await page.goto("/jaldee-leads/products");
  90  |     await expect(page.getByText("Products & Services")).toBeVisible({ timeout: 15000 });
  91  |     await pause();
  92  |     await page.getByRole("button", { name: /Add Product/i }).click();
  93  |     await expect(page.getByTestId("jaldee-leads-product-form-name-input")).toBeVisible();
  94  |     await page.getByTestId("jaldee-leads-product-form-name-input").fill("Acme Membership");
  95  |     await page.getByTestId("jaldee-leads-product-form-pipeline-select").selectOption({ label: "Acme Standard Sales" });
  96  |     await page.getByTestId("jaldee-leads-product-form-save-button").click();
  97  |     await pause();
  98  | 
  99  |     // 10. Navigate to Channels & Create Channel
  100 |     await page.goto("/jaldee-leads/channels");
  101 |     await expect(page.getByText("Channels", { exact: true })).toBeVisible({ timeout: 15000 });
  102 |     await pause();
  103 |     await page.getByRole("button", { name: /\+ Channel/i }).click();
  104 |     // Assuming channels have inputs we can select by label, we use robust locators
  105 |     await page.getByLabel(/Channel Name/i).fill("Acme Website");
  106 |     await page.getByRole("button", { name: /Save/i }).click();
  107 |     await pause();
  108 | 
  109 |     // 11. Navigate to Lead Creation
  110 |     await page.goto("/jaldee-leads/leads/create");
  111 |     await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible({ timeout: 15000 });
  112 |     await pause();
  113 | 
  114 |     // 12. Create Lead
  115 |     await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill("John");
  116 |     await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill("Doe");
  117 |     await page.getByTestId("jaldee-leads-create-lead-email-input").fill("john.doe.lead@example.com");
  118 |     await page.getByTestId("jaldee-leads-create-lead-company-input").fill("Doe Enterprises");
  119 |     await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption({ label: "Acme Membership" });
  120 |     await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption({ label: "Acme Website" });
  121 |     await pause();
  122 |     await page.getByTestId("jaldee-leads-create-lead-save-button").click();
  123 | 
  124 |     // 13. Verify Lead created and navigated to Leads list
  125 |     await expect(page).toHaveURL(/\/jaldee-leads\/leads/);
  126 |     await pause(3000); // Leave it on screen for a moment at the end!
  127 |   });
  128 | });
  129 | 
```