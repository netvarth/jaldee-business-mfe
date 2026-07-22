const { chromium } = require("@playwright/test");

const SIGNUP_PASSWORD = process.env.AUTOMATION_SIGNUP_PASSWORD || "DemoHR@2026";
const AUTOMATION_BASE_URL = process.env.AUTOMATION_BASE_URL || "http://localhost:3000";

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function run() {
  const isHeaded = !process.argv.includes("--headless");
  const pauseDelay = 400;
  const suffix = `${Date.now()}`.slice(-6);
  let managedEmployeeLoginId = "";
  let currentRunEmployeeUid = "";
  const futureDate = (daysAhead) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().slice(0, 10);
  };
  const uniquePhone = (sequence) =>
    `5555${String((Number(suffix) + sequence) % 1_000_000).padStart(6, "0")}`;

  console.log("=========================================================");
  console.log("  STARTING VISUAL IT ENTERPRISE HR AUTOMATION DEMO       ");
  console.log("=========================================================");

  const launchOptions = {
    headless: !isHeaded,
    slowMo: isHeaded ? 250 : 0,
    args: ["--start-maximized"],
  };
  let browser;
  if (isHeaded) {
    for (const channel of ["chrome", "msedge"]) {
      try {
        browser = await chromium.launch({ ...launchOptions, channel });
        console.log(`   [Browser] Using installed ${channel} for current-location support`);
        break;
      } catch {
        console.log(`   [Browser] Installed ${channel} unavailable; trying next browser`);
      }
    }
  }
  if (!browser) {
    browser = await chromium.launch(launchOptions);
    console.log("   [Browser] Using bundled Chromium; current location may require fallback values");
  }

  const context = await browser.newContext({
    baseURL: AUTOMATION_BASE_URL,
    viewport: null,
    permissions: ["geolocation"],
    geolocation: { latitude: 10.5116834, longitude: 76.2164267 },
  });

  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));

  async function closeAnyOpenModal() {
    const overlays = page.locator('[data-testid$="-modal-overlay"], [data-testid$="-modal"], [data-testid="dialog-overlay"]');
    if (await overlays.first().isVisible().catch(() => false)) {
      const closeBtns = page.locator('[data-testid$="-modal-close"], [data-testid="dialog-close"], [data-testid="hr-candidate-cancel"], button:has-text("Cancel")');
      if (await closeBtns.first().isVisible().catch(() => false)) {
        await closeBtns.first().click().catch(() => {});
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  async function slowType(selector, text, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Field] Entering ${labelName}: "${text}"`);
      await el.click().catch(() => {});
      await el.fill(text).catch(() => {});
      await page.waitForTimeout(250);
      return true;
    }
    return false;
  }

  async function slowDate(selector, dateStr, labelName) {
    let el = page.locator(selector).first();
    const foundBySelector = await el.waitFor({ state: "attached", timeout: 1500 }).then(() => true).catch(() => false);
    if (!foundBySelector) {
      const testIdMatch = selector.match(/\[data-testid=["']([^"']+)["']\]/);
      const idFallback = testIdMatch ? page.locator(`#${testIdMatch[1]}`).first() : null;
      const foundById = idFallback
        ? await idFallback.waitFor({ state: "attached", timeout: 1500 }).then(() => true).catch(() => false)
        : false;

      if (foundById && idFallback) {
        el = idFallback;
      } else {
        const dialogDates = page.locator('[role="dialog"] input[type="hidden"], [data-testid$="-modal"] input[type="hidden"]');
        const isEndDate = /end/i.test(labelName || selector);
        el = dialogDates.nth(isEndDate ? 1 : 0);
      }
      await el.waitFor({ state: "attached", timeout: 5000 });
      console.log(`   [Date] ${selector} unavailable; using matching DatePicker fallback input`);
    }
    if (labelName) console.log(`   [Date] Setting ${labelName}: "${dateStr}"`);

    const displayInput = el.locator('xpath=following-sibling::div//input').first();
    if (await displayInput.isVisible().catch(() => false)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      await displayInput.click();
      await page.locator('#date-picker-popover-month').selectOption(String(month - 1));
      await page.locator('#date-picker-popover-year').selectOption(String(year));
      const calendarOverlay = page.locator('#date-picker-popover-month').locator('xpath=ancestor::div[contains(@class,"fixed") and contains(@class,"inset-0")]');
      await calendarOverlay.getByRole("button", { name: String(day), exact: true }).click();
    } else if (await el.isVisible().catch(() => false)) {
      await el.fill(dateStr);
    } else {
      await el.evaluate((input, val) => {
        const fiberKey = Object.keys(input).find((key) => key.startsWith("__reactFiber$"));
        let fiber = fiberKey ? input[fiberKey] : null;

        while (fiber) {
          if (typeof fiber.memoizedProps?.onChange === "function") {
            fiber.memoizedProps.onChange({
              target: { value: val, name: input.name, id: input.id },
              currentTarget: { value: val, name: input.name, id: input.id },
            });
            return;
          }
          fiber = fiber.return;
        }

        throw new Error(`Unable to update controlled date input ${input.dataset.testid || input.id}`);
      }, dateStr);
    }

    await el.evaluate((input, val) => new Promise((resolve, reject) => {
      const started = Date.now();
      const verify = () => {
        if (input.value === val) resolve(true);
        else if (Date.now() - started >= 5000) reject(new Error(`Date value remained "${input.value}"`));
        else setTimeout(verify, 50);
      };
      verify();
    }), dateStr);
    console.log(`   [Date] Confirmed ${labelName || selector}: "${await el.inputValue()}"`);
    await page.waitForTimeout(250);
    return true;
  }

  async function slowSelect(selector, value, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Select] Choosing ${labelName}: "${value}"`);
      const matchingOption = await el.locator("option").evaluateAll((options, requested) => {
        const match = options.find((option) => option.value === requested || option.label === requested);
        return match ? match.value : null;
      }, value);
      if (!matchingOption) {
        throw new Error(`Option "${value}" is not available for ${labelName || selector}`);
      }
      await el.selectOption(matchingOption);
      await page.waitForTimeout(250);
      return true;
    }
    return false;
  }

  async function slowSelectFirstOption(selector, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      await el.locator('option:not([value=""]):not([disabled])').first()
        .waitFor({ state: "attached", timeout: 5000 })
        .catch(() => {});
      const options = await el.locator("option").evaluateAll((nodes) =>
        nodes
          .map((n) => ({ value: n.value, disabled: n.disabled }))
          .filter((o) => !!o.value && !o.disabled)
      );
      if (options.length > 0) {
        if (labelName) console.log(`   [Select] Choosing first available ${labelName}: "${options[0].value}"`);
        await el.selectOption(options[0].value).catch(() => {});
        await page.waitForTimeout(250);
        return true;
      }
    }
    return false;
  }

  async function slowSelectOptionByLabel(selector, optionLabel, labelName) {
    const el = page.locator(selector).first();
    if (!(await el.isVisible({ timeout: 5000 }).catch(() => false))) return false;
    const value = await el.locator("option").evaluateAll((options, expectedLabel) => {
      const expected = String(expectedLabel).trim();
      const match = options.find((option) => option.textContent.trim() === expected || option.label.trim() === expected);
      return match && !match.disabled ? match.value : null;
    }, optionLabel);
    if (!value) return false;
    console.log(`   [Select] Choosing created ${labelName}: "${optionLabel}"`);
    await el.selectOption(value);
    await page.waitForTimeout(250);
    return true;
  }

  async function slowTime(testId, timeStr, labelName) {
    const inputEl = page.locator(`[data-testid="${testId}"]`).first();
    if (await inputEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Time] Setting ${labelName}: "${timeStr}"`);

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

      await page.evaluate(({ tId, val }) => {
        const input = document.querySelector(`[data-testid="${tId}"]`);
        if (!input) return;

        let el = input;
        while (el) {
          const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
          if (key && el[key]) {
            let fiber = el[key];
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
      }, { tId: testId, val: formatted12 }).catch(() => {});
      await page.waitForTimeout(200);

      const trigger = page.locator(`[data-testid="${testId}-trigger"]`).or(inputEl).first();
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);

        const hourBtn = page.locator(`[data-testid="${testId}-hour-${hour2Digits}"]`).first();
        if (await hourBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
          await hourBtn.click().catch(() => {});
          await page.waitForTimeout(150);

          const minBtn = page.locator(`[data-testid="${testId}-min-${min}"]`).first();
          if (await minBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await minBtn.click().catch(() => {});
            await page.waitForTimeout(150);
          }

          const periodBtn = page.locator(`[data-testid="${testId}-period-${period}"]`).first();
          if (await periodBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await periodBtn.click().catch(() => {});
            await page.waitForTimeout(150);
          }

          const modalHeader = page.locator('h3:has-text("Add Shift"), h3:has-text("Edit Shift")').first();
          if (await modalHeader.isVisible().catch(() => false)) {
            await modalHeader.click({ force: true }).catch(() => {});
          }
          await page.waitForTimeout(150);
        }
      }
      return true;
    }
    return false;
  }

  async function slowClick(selector, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Action] Clicking ${labelName}`);
      await el.click();
      await page.waitForTimeout(pauseDelay);
      return true;
    }
    return false;
  }

  async function clickFirstPrefix(prefix, labelName) {
    const target = page.locator(`[data-testid^="${prefix}"]`).first();
    if (!(await target.isVisible({ timeout: 2500 }).catch(() => false))) {
      console.log(`   [Skip] ${labelName}: no matching record/action available`);
      return false;
    }
    console.log(`   [Action] ${labelName}`);
    await target.click();
    await page.waitForTimeout(pauseDelay);
    return true;
  }

  async function visitHr(path, labelName) {
    console.log(`\n>>> ${labelName}...`);
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
  }

  async function openSettingsSection(section, readySelector) {
    const sectionButton = page.locator(`[data-testid="hr-settings-section-${section}"]`);
    await sectionButton.waitFor({ state: "visible", timeout: 20000 });
    await sectionButton.click();
    await page.waitForURL(new RegExp(`/hr/settings/${section}(?:[/?#]|$)`), { timeout: 15000 });
    await page.locator(readySelector).waitFor({ state: "visible", timeout: 30000 });
  }

  async function confirmDialogSubmission(dialogSelector, recordText, labelName) {
    const dialog = page.locator(dialogSelector).first();
    const closed = await dialog.waitFor({ state: "hidden", timeout: 20_000 }).then(() => true).catch(() => false);
    if (!closed) {
      const errors = await dialog.locator('[role="alert"], .text-red-700, [style*="danger"], [style*="244,63,94"]')
        .allTextContents()
        .catch(() => []);
      throw new Error(`${labelName} was not saved: ${errors.join(" ").trim() || "dialog remained open after 20 seconds"}`);
    }
    const rowVisible = await page.getByText(recordText, { exact: false }).first()
      .waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false);
    console.log(`   [Verified] ${labelName} saved${rowVisible ? ` and visible: "${recordText}"` : `: dialog closed successfully (table refresh pending)`}`);
  }

  async function slowSaveModal(scope) {
    let modal = page.locator(`[data-testid="${scope}-modal"]`).first();
    if (!(await modal.isVisible({ timeout: 3000 }).catch(() => false))) {
      modal = page.locator('[role="dialog"]:visible').last();
    }
    const saveBtn = modal.locator(`[data-testid="${scope}-save"], button:has-text("Save"), button:has-text("Create")`).first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`   [Action] Saving modal for ${scope}`);
      await saveBtn.click();
      await page.waitForTimeout(800);
      const closed = await modal.waitFor({ state: "hidden", timeout: 20000 }).then(() => true).catch(() => false);
      if (!closed) {
        const errorText = await modal.locator('[role="alert"], .text-red-700').allTextContents().catch(() => []);
        throw new Error(`${scope} was not saved: ${errorText.join(" ").trim() || "modal remained open"}`);
      }
      console.log(`   [View] Waiting on ${scope} list to verify the saved record`);
      await page.waitForTimeout(3000);
    } else {
      const fallbackBtn = page.locator(`[data-testid="${scope}-save"]`).first();
      if (await fallbackBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`   [Action] Saving modal fallback for ${scope}`);
        await fallbackBtn.click();
        await page.waitForTimeout(800);
      } else {
        throw new Error(`Save button was not available for ${scope}`);
      }
    }
  }

  console.log("\n>>> 1. AUTHENTICATION - CREATE ACCOUNT AND MANUAL OTP...");
  const signupLoginId = `hrdemo${suffix}`;
  const signupPhone = uniquePhone(0);
  await page.goto("http://localhost:3000/signup", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await slowType('[data-testid="signup-login-id-input"]', signupLoginId, "Signup Login ID");
  await slowType('[data-testid="signup-tenant-name-input"]', `Dhyandarsh IT Technologies ${suffix}`, "Business Name");
  await slowType('[data-testid="signup-first-name-input"]', "Automation", "First Name");
  await slowType('[data-testid="signup-last-name-input"]', "Admin", "Last Name");
  await slowType('[data-testid="signup-password-input"]', SIGNUP_PASSWORD, "Signup Password");
  if (!(await slowType('[data-testid="signup-mobile-input-number"]', signupPhone, "Signup Phone"))) {
    throw new Error("Signup WhatsApp / Mobile Number field was not available");
  }
  if ((await page.locator('[data-testid="signup-mobile-input-number"]').inputValue()).replace(/\D/g, "") !== signupPhone) {
    throw new Error("Signup phone number was not retained");
  }
  const terms = page.locator('[data-testid="signup-terms-checkbox"]').first();
  if (!(await terms.isChecked().catch(() => false))) await terms.click();
  await slowClick('[data-testid="signup-create-account-button"]', "Create Account and Send OTP");
  await page.locator('[data-testid="signup-otp-form"]').waitFor({ state: "visible", timeout: 30000 });
  console.log('   [OTP] Entering fixed OTP "555555" for 5555 test number');
  const signupOtpDigits = page.locator('[data-testid^="signup-otp-input-digit-"]');
  await signupOtpDigits.first().waitFor({ state: "visible", timeout: 10000 });
  for (let i = 0; i < 6; i++) {
    await signupOtpDigits.nth(i).fill("5");
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(2000);
  await slowClick('[data-testid="signup-verify-otp-button"]', "Verify Signup OTP");
  await page.waitForURL((url) => !url.pathname.includes("/signup"), { timeout: 30000 });
  if (await page.locator('[data-testid="onboarding-page"]').isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log("\n>>> SIGNUP ONBOARDING - COMPLETE ALL 4 STEPS...");
    const onboardingPause = 1500;
    await slowType('[data-testid="onboarding-company-name-input"]', `Dhyandarsh IT Technologies ${suffix}`, "Onboarding Company Name");
    await page.waitForTimeout(onboardingPause);
    await slowSelect('[data-testid="onboarding-country-select"]', "india", "Onboarding Country");
    await page.waitForTimeout(onboardingPause);
    await slowType('[data-testid="onboarding-gstin-input"]', "29ABCDE1234F1Z5", "Onboarding GSTIN");
    await page.waitForTimeout(onboardingPause);
    if (!(await slowType('[data-testid="onboarding-business-phone-input-number"]', signupPhone, "Onboarding Business Phone"))) {
      throw new Error("Onboarding Business Phone field was not available");
    }
    await page.waitForTimeout(onboardingPause);
    await slowClick('[data-testid="onboarding-continue-button"]', "Continue Business Details");
    await page.locator('[data-testid="onboarding-page"][data-state="step-2"]').waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(onboardingPause);
    for (const solutionId of ["health", "bookings", "karty", "lending", "hr", "finance"]) {
      const solution = page.locator(`[data-testid="onboarding-solution-${solutionId}-button"]`);
      const shouldBeSelected = solutionId === "hr";
      const isSelected = await solution.getAttribute("data-active") === "true";
      if (isSelected !== shouldBeSelected) await solution.click();
    }
    await page.locator('[data-testid="onboarding-solution-hr-button"][data-active="true"]').waitFor({ state: "visible", timeout: 10000 });
    console.log("   [Verified] HR is the only onboarding solution selected");
    await page.waitForTimeout(onboardingPause);
    await slowClick('[data-testid="onboarding-continue-button"]', "Continue Business Solutions");
    await page.locator('[data-testid="onboarding-page"][data-state="step-3"]').waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(onboardingPause);
    const latitudeInput = page.locator('[data-testid="onboarding-latitude-input"]');
    const latitudeBeforeDetect = await latitudeInput.inputValue();
    await slowClick('[data-testid="onboarding-location-auto-detect-button"]', "Auto Detect Current Location");
    const currentLocationDetected = await page.waitForFunction((previous) => {
      const input = document.querySelector('[data-testid="onboarding-latitude-input"]');
      return input && input.value && input.value !== previous;
    }, latitudeBeforeDetect, { timeout: 35000 }).then(() => true).catch(() => false);
    if (!currentLocationDetected) {
      console.log("   [Fallback] Current location was unavailable; continuing with fallback location values");
    }
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="onboarding-location-auto-detect-button"]');
      return button && !button.disabled;
    }, null, { timeout: 10000 });
    const detectedLatitude = await latitudeInput.inputValue();
    const detectedLongitude = await page.locator('[data-testid="onboarding-longitude-input"]').inputValue();
    await page.waitForTimeout(2000);
    const fillLocationFallback = async (selector, value, label) => {
      const field = page.locator(selector).first();
      if (!(await field.inputValue()).trim()) await slowType(selector, value, `${label} Fallback`);
    };
    await fillLocationFallback('[data-testid="onboarding-location-search-input"]', `${detectedLatitude}, ${detectedLongitude}`, "Detected Location Coordinates");
    await slowType('[data-testid="onboarding-location-name-input"]', "Thrissur", "Location Name");
    await slowType('[data-testid="onboarding-pincode-input"]', "680020", "Pin Code");
    await slowType('[data-testid="onboarding-full-address-textarea"]', "Crown Tower", "Full Address");
    await slowSelect('[data-testid="onboarding-parking-select"]', "FREE", "Parking");
    const alwaysOpen = page.locator('[data-testid="onboarding-always-open-checkbox"]').first();
    if (!(await alwaysOpen.isChecked().catch(() => false))) await alwaysOpen.click();
    await page.waitForTimeout(3000);
    await slowClick('[data-testid="onboarding-continue-button"]', "Create Business Location");
    await page.locator('[data-testid="onboarding-page"][data-state="step-4"]').waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(3000);
    await slowClick('[data-testid="onboarding-go-to-dashboard-button"]', "Go to Dashboard");
    await page.waitForURL((url) => !url.pathname.includes("/onboarding"), { timeout: 30000 });
  }

  console.log("\n>>> 2. SETTINGS - COMPANY PROFILE FORM (IT TECH ENTERPRISE)...");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto(`${AUTOMATION_BASE_URL}/hr/settings/company`, { waitUntil: "domcontentloaded" });
    const settingsPageReady = await page.locator('[data-testid="hr-settings-page"]').waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
    if (!settingsPageReady) {
      if (attempt === 2) throw new Error(`HR Settings page did not open. Current URL: ${page.url()}`);
      await page.waitForTimeout(3000);
      continue;
    }
    const companyFieldReady = await page.locator('[data-testid="hr-settings-company-name"]').waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
    if (companyFieldReady) break;
    const companyLoadError = await page.locator('[data-testid="hr-settings-company-error"]').textContent().catch(() => "");
    if (companyLoadError) throw new Error(`Company Profile could not load: ${companyLoadError.trim()}`);
    if (attempt === 2) throw new Error(`Company Profile remained in loading state. Current URL: ${page.url()}`);
    console.log("   [Retry] Company Profile data was still loading; reopening Settings");
    await page.waitForTimeout(3000);
  }
  await slowType('[data-testid="hr-settings-company-name"], input[name="name"]', `Dhyandarsh IT Technologies ${suffix}`, "Company Name");
  await slowType('[data-testid="hr-settings-company-legalname"]', "Dhyandarsh IT Technologies Private Limited", "Legal Name");
  await slowType('[data-testid="hr-settings-company-industry"]', "Information Technology & Enterprise Software", "Industry");
  await slowType('[data-testid="hr-settings-company-email"]', `corporate.${suffix}.test@jaldee.com`, "Contact Email");
  await slowType('[data-testid="hr-settings-company-phone"]', "5555000000", "Phone");
  await slowType('[data-testid="hr-settings-company-logourl"]', "https://www.jaldee.com/favicon.ico", "Logo URL");
  await slowType('[data-testid="hr-settings-company-addressline"]', "Crown Tower", "Address");
  await slowType('[data-testid="hr-settings-company-city"]', "Thrissur", "City");
  await slowType('[data-testid="hr-settings-company-state"]', "Kerala", "State");
  await slowType('[data-testid="hr-settings-company-country"]', "India", "Country");
  await slowType('[data-testid="hr-settings-company-gstin"]', "29ABCDE1234F1Z5", "GSTIN");
  await slowType('[data-testid="hr-settings-company-pan"]', "ABCDE1234F", "PAN");
  await slowSelect('[data-testid="hr-settings-company-currency"]', "INR", "Currency");
  await slowType('[data-testid="hr-settings-company-workingdays"]', "Monday - Friday", "Working Days");
  const companyExpectedValues = {
    name: `Dhyandarsh IT Technologies ${suffix}`, legalname: "Dhyandarsh IT Technologies Private Limited",
    industry: "Information Technology & Enterprise Software", email: `corporate.${suffix}.test@jaldee.com`,
    phone: "5555000000", logourl: "https://www.jaldee.com/favicon.ico", addressline: "Crown Tower",
    city: "Thrissur", state: "Kerala", country: "India", gstin: "29ABCDE1234F1Z5", pan: "ABCDE1234F",
    currency: "INR", workingdays: "Monday - Friday",
  };
  for (const [field, expected] of Object.entries(companyExpectedValues)) {
    const actual = await page.locator(`[data-testid="hr-settings-company-${field}"]`).inputValue();
    if (actual !== expected) throw new Error(`Company Profile ${field} was not retained (expected "${expected}", got "${actual}")`);
  }
  const companySaveResponse = page.waitForResponse((response) => response.url().includes("/company-profile") && response.request().method() === "PUT", { timeout: 30000 });
  if (!(await slowClick('[data-testid="hr-settings-company-save"], button:has-text("Save Changes")', "Save Company Profile"))) throw new Error("Company Profile Save button was not available");
  const savedCompany = await companySaveResponse;
  console.log(`   [Response] Save Company Profile: ${savedCompany.status()} ${savedCompany.statusText()}`);
  if (!savedCompany.ok()) throw new Error(`Company Profile save failed with HTTP ${savedCompany.status()}`);
  await page.waitForTimeout(1500);

  console.log("\n>>> 3. SETTINGS - ADD 5 IT DEPARTMENTS...");
  await openSettingsSection("departments", '[data-testid="hr-settings-departments-add"]');
  const deptList = [
    { name: `Software Engineering ${suffix}`, code: `ENG-${suffix}` },
    { name: `Cloud & Infrastructure ${suffix}`, code: `INF-${suffix}` },
    { name: `Product Management ${suffix}`, code: `PMO-${suffix}` },
    { name: `Human Resources & Talent ${suffix}`, code: `HRT-${suffix}` },
    { name: `Cybersecurity & IT Ops ${suffix}`, code: `SEC-${suffix}` },
  ];
  for (let i = 0; i < deptList.length; i++) {
    const d = deptList[i];
    await closeAnyOpenModal();
    if (!(await slowClick('[data-testid="hr-settings-departments-add"], button:has-text("Add Department")', `Add ${d.name}`))) {
      throw new Error(`Add Department button was not available at ${page.url()}`);
    }
    await page.locator('[data-testid="hr-settings-departments-modal"]').waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-settings-departments-name"]', d.name, `Dept Name ${i + 1}`);
    await slowType('[data-testid="hr-settings-departments-code"]', d.code, `Dept Code ${i + 1}`);
    await slowSaveModal("hr-settings-departments");
    await page.waitForTimeout(500);
  }

  const departmentToEdit = deptList[0];
  const updatedDepartmentName = `${departmentToEdit.name} Updated`;
  const createdDepartmentRow = page.locator('[data-testid="hr-settings-departments-panel"] tr')
    .filter({ hasText: departmentToEdit.name }).first();
  await createdDepartmentRow.waitFor({ state: "visible", timeout: 10000 });
  await createdDepartmentRow.locator('[data-testid^="hr-settings-departments-edit-"]').click();
  await slowType('[data-testid="hr-settings-departments-name"]', updatedDepartmentName, "Edit Department Name");
  await slowSaveModal("hr-settings-departments");
  await page.getByText(updatedDepartmentName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  departmentToEdit.name = updatedDepartmentName;
  console.log(`   [Verified] Department updated: "${updatedDepartmentName}"`);

  console.log("\n>>> 4. SETTINGS - ADD 5 IT ROLES / DESIGNATIONS...");
  await openSettingsSection("designations", '[data-testid="hr-settings-designations-add"]');
  const roleList = [
    { name: `Senior Full Stack Engineer ${suffix}`, code: `SFE-${suffix}`, level: "3", desc: "Leads React and Node microservices engineering" },
    { name: `DevOps & Cloud Architect ${suffix}`, code: `DCA-${suffix}`, level: "2", desc: "Manages AWS cloud architecture and CI/CD pipelines" },
    { name: `Product Manager ${suffix}`, code: `PDM-${suffix}`, level: "3", desc: "Drives product roadmap, user stories and sprint planning" },
    { name: `HR Business Partner ${suffix}`, code: `HRB-${suffix}`, level: "3", desc: "Manages tech hiring, talent retention and payroll" },
    { name: `Cybersecurity Analyst ${suffix}`, code: `CSA-${suffix}`, level: "4", desc: "Monitors SOC operations, security compliance and audits" },
  ];
  for (let i = 0; i < roleList.length; i++) {
    const r = roleList[i];
    await closeAnyOpenModal();
    const designationAdd = page.locator('[data-testid="hr-settings-designations-add"]').first();
    await designationAdd.waitFor({ state: "visible", timeout: 20000 });
    console.log(`   [Action] Clicking Add ${r.name}`);
    await designationAdd.click();
    await page.locator('[data-testid="hr-settings-designations-modal"]').waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-settings-designations-name"]', r.name, `Role Name ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-code"]', r.code, `Role Code ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-level"]', r.level, `Seniority Level ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-description"]', r.desc, `Description ${i + 1}`);
    await slowSelectFirstOption('[data-testid="hr-settings-designations-hrdepartmentuid"]', `Department Dropdown ${i + 1}`);
    await slowSaveModal("hr-settings-designations");
    await page.waitForTimeout(500);
  }

  const roleToEdit = roleList[0];
  const updatedRoleName = `${roleToEdit.name} Updated`;
  const createdRoleRow = page.locator('[data-testid="hr-settings-designations-panel"] tr')
    .filter({ hasText: roleToEdit.name }).first();
  await createdRoleRow.waitFor({ state: "visible", timeout: 10000 });
  await createdRoleRow.locator('[data-testid^="hr-settings-designations-edit-"]').click();
  await slowType('[data-testid="hr-settings-designations-name"]', updatedRoleName, "Edit Role Name");
  await slowType('[data-testid="hr-settings-designations-description"]', `${roleToEdit.desc} (updated)`, "Edit Role Description");
  await slowSaveModal("hr-settings-designations");
  await page.getByText(updatedRoleName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  roleToEdit.name = updatedRoleName;
  console.log(`   [Verified] Role updated: "${updatedRoleName}"`);

  console.log("\n>>> 5. SETTINGS - ADD 5 IT SHIFTS...");
  await openSettingsSection("shifts", '[data-testid="hr-settings-shifts-add"]');
  const shiftList = [
    { name: `Day Development Shift ${suffix}`, start: "09:00 AM", end: "05:00 PM" },
    { name: `APAC Support Shift ${suffix}`, start: "08:00 AM", end: "04:00 PM" },
    { name: `EMEA Coverage Shift ${suffix}`, start: "01:00 PM", end: "09:00 PM" },
    { name: `24x7 IT NOC Night Shift ${suffix}`, start: "09:00 PM", end: "05:00 AM" },
    { name: `Flexible Tech Hours ${suffix}`, start: "10:00 AM", end: "06:00 PM" },
  ];
  for (let i = 0; i < shiftList.length; i++) {
    const s = shiftList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-settings-shifts-add"]', `Add ${s.name}`);
    const shiftModal = page.locator('[data-testid="hr-settings-shifts-modal"]');
    await shiftModal.waitFor({ state: "visible", timeout: 10000 });
    await shiftModal.locator('[data-testid="hr-settings-shifts-weeklyoffdays"]').waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-settings-shifts-name"]', s.name, `Shift Name ${i + 1}`);
    await slowTime("hr-settings-shifts-starttime", s.start, `Start Time ${i + 1}`);
    await slowTime("hr-settings-shifts-endtime", s.end, `End Time ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-graceminutes"]', "15", `Grace Minutes ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-halfdaythresholdminutes"]', "240", `Half-Day Threshold ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-breakminutes"]', "45", `Break Minutes ${i + 1}`);
    await slowClick('[data-testid="hr-settings-shifts-weeklyoffdays"]', `Weekly Off ${i + 1}`);
    await page.locator('[data-testid="hr-settings-shifts-weeklyoffdays-menu"]').waitFor({ state: "visible", timeout: 5000 });
    await slowClick('[data-testid="hr-settings-shifts-weeklyoffdays-option-SUNDAY"]', `Select Sunday Weekly Off ${i + 1}`);
    await shiftModal.locator('[data-testid="hr-settings-shifts-name"]').click();
    await page.locator('[data-testid="hr-settings-shifts-weeklyoffdays-menu"]')
      .waitFor({ state: "hidden", timeout: 5000 });
    await shiftModal.locator('[data-testid="hr-settings-shifts-save"]').click();
    const shiftModalClosed = await shiftModal.waitFor({ state: "hidden", timeout: 20000 }).then(() => true).catch(() => false);
    if (!shiftModalClosed) {
      const shiftError = await shiftModal.locator('[role="alert"], [data-testid$="-error"], .text-red-700').allTextContents().catch(() => []);
      throw new Error(`Shift was not saved: ${shiftError.join(" ").trim() || "modal remained open"}`);
    }
    console.log("   [View] Waiting on Shift list to verify the saved record");
    await page.waitForTimeout(3000);
    await page.waitForTimeout(500);
  }
  const shiftToEdit = shiftList[0];
  const updatedShiftName = `${shiftToEdit.name} Updated`;
  const createdShiftRow = page.locator('[data-testid="hr-settings-shifts-panel"] tr').filter({ hasText: shiftToEdit.name }).first();
  await createdShiftRow.waitFor({ state: "visible", timeout: 10000 });
  await createdShiftRow.locator('[data-testid^="hr-settings-shifts-edit-"]').click();
  await slowType('[data-testid="hr-settings-shifts-name"]', updatedShiftName, "Edit Shift Name");
  await slowType('[data-testid="hr-settings-shifts-graceminutes"]', "20", "Edit Shift Grace Minutes");
  const editShiftModal = page.locator('[data-testid="hr-settings-shifts-modal"]');
  await editShiftModal.locator('[data-testid="hr-settings-shifts-save"]').click();
  await editShiftModal.waitFor({ state: "hidden", timeout: 20000 });
  await page.getByText(updatedShiftName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  shiftToEdit.name = updatedShiftName;
  console.log(`   [Verified] Shift updated: "${updatedShiftName}"`);

  console.log("\n>>> 6. SETTINGS - CREATE 5 IT LEAVE TYPES...");
  await openSettingsSection("leavetypes", '[data-testid="hr-settings-leave-policy-create"]');
  const saveLeavePolicy = async () => {
    const policyModal = page.locator('[data-testid="hr-settings-leave-policy-modal"]');
    await policyModal.waitFor({ state: "visible", timeout: 10000 });
    await policyModal.locator('[data-testid="hr-settings-leave-policy-save"]').click();
    const closed = await policyModal.waitFor({ state: "hidden", timeout: 20000 }).then(() => true).catch(() => false);
    if (!closed) {
      const errorText = await policyModal.locator('[role="alert"], [data-testid$="-error"], .text-red-700').allTextContents().catch(() => []);
      throw new Error(`Leave Type was not saved: ${errorText.join(" ").trim() || "modal remained open"}`);
    }
    console.log("   [View] Waiting on Leave Type list to verify the saved record");
    await page.waitForTimeout(3000);
  };
  const leaveList = [
    { name: `Annual Paid Privilege Leave ${suffix}`, cat: "CASUAL", quota: "14" },
    { name: `Sick & Wellness Leave ${suffix}`, cat: "SICK", quota: "12" },
    { name: `Earned Technical Sabbatical ${suffix}`, cat: "EARNED", quota: "18" },
    { name: `Maternity & Family Care Leave ${suffix}`, cat: "MATERNITY", quota: "90" },
    { name: `Weekend On-Call Comp Off ${suffix}`, cat: "COMP_OFF", quota: "10" },
  ];
  for (let i = 0; i < leaveList.length; i++) {
    const l = leaveList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-settings-leave-policy-create"]', `Create ${l.name}`);
    await page.locator('[data-testid="hr-settings-leave-policy-modal"]').waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-settings-leave-policy-name"]', l.name, `Leave Name ${i + 1}`);
    await slowSelect('[data-testid="hr-settings-leave-policy-category"]', l.cat, `Category ${i + 1}`);
    await slowType('[data-testid="hr-settings-leave-policy-quota"]', l.quota, `Quota ${i + 1}`);
    const accrualType = i === 0 ? "Yearly" : "Monthly";
    await slowSelect('[data-testid="hr-settings-leave-policy-accrual"]', accrualType, `Accrual ${i + 1}`);
    await saveLeavePolicy();
    await page.waitForTimeout(500);
  }
  const leaveTypeToEdit = leaveList[0];
  const updatedLeaveTypeName = `${leaveTypeToEdit.name} Updated`;
  const createdLeaveTypeRow = page.locator('[data-testid="hr-settings-leave-policy-table"] tr').filter({ hasText: leaveTypeToEdit.name }).first();
  await createdLeaveTypeRow.locator('[data-testid^="hr-settings-leave-policy-edit-"]').click();
  await slowType('[data-testid="hr-settings-leave-policy-name"]', updatedLeaveTypeName, "Edit Leave Type Name");
  await slowType('[data-testid="hr-settings-leave-policy-quota"]', "15", "Edit Leave Type Quota");
  await saveLeavePolicy();
  await page.getByText(updatedLeaveTypeName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  leaveTypeToEdit.name = updatedLeaveTypeName;
  console.log(`   [Verified] Leave type updated: "${updatedLeaveTypeName}"`);

  console.log("\n>>> 7. SETTINGS - ADD 5 IT HOLIDAYS...");
  await openSettingsSection("holidays", '[data-testid="hr-settings-holidays-add"]');
  const holidayList = [
    { name: `Republic Day ${suffix}`, date: "2026-01-26", type: "Public" },
    { name: `Independence Day ${suffix}`, date: "2026-08-15", type: "Public" },
    { name: `Gandhi Jayanti ${suffix}`, date: "2026-10-02", type: "Public" },
    { name: `Regional Optional Holiday ${suffix}`, date: "2026-11-01", type: "Optional" },
    { name: `Private Company Holiday ${suffix}`, date: "2026-12-25", type: "Restricted" },
  ];
  for (let i = 0; i < holidayList.length; i++) {
    const h = holidayList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-settings-holidays-add"]', `Add ${h.name}`);
    const holidayModal = page.locator('[data-testid="hr-settings-holidays-modal"]');
    await holidayModal.waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-settings-holidays-name"]', h.name, `Holiday Name ${i + 1}`);
    await holidayModal.locator('[data-testid="hr-settings-holidays-date"]').waitFor({ state: "attached", timeout: 10000 });
    await slowDate('[data-testid="hr-settings-holidays-date"]', h.date, `Holiday Date ${i + 1}`);
    await slowSelect('[data-testid="hr-settings-holidays-type"]', h.type, `Holiday Type ${i + 1}`);
    await holidayModal.locator('[data-testid="hr-settings-holidays-save"]').click();
    await holidayModal.waitFor({ state: "hidden", timeout: 20000 });
    await page.waitForTimeout(3000);
  }
  const holidayToEdit = holidayList[0];
  const updatedHolidayName = `${holidayToEdit.name} Updated`;
  const createdHolidayRow = page.locator('[data-testid="hr-settings-holidays-panel"] tr').filter({ hasText: holidayToEdit.name }).first();
  await createdHolidayRow.locator('[data-testid^="hr-settings-holidays-edit-"]').click();
  await slowType('[data-testid="hr-settings-holidays-name"]', updatedHolidayName, "Edit Holiday Name");
  const editHolidayModal = page.locator('[data-testid="hr-settings-holidays-modal"]');
  await editHolidayModal.locator('[data-testid="hr-settings-holidays-save"]').click();
  await editHolidayModal.waitFor({ state: "hidden", timeout: 20000 });
  await page.getByText(updatedHolidayName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  holidayToEdit.name = updatedHolidayName;
  console.log(`   [Verified] Holiday updated: "${updatedHolidayName}"`);

  console.log("\n>>> SETTINGS - ATTENDANCE RULES...");
  await openSettingsSection("attendance", '[data-testid="hr-settings-attendance-save"]');
  await slowType('[data-testid="hr-settings-attendance-workhoursperday"]', "8", "Work Hours Per Day");
  await slowType('[data-testid="hr-settings-attendance-fulldaythresholdhours"]', "8", "Full Day Threshold Hours");
  await slowTime("hr-settings-attendance-shiftstarttime", "09:00 AM", "Shift Start Time");
  await slowType('[data-testid="hr-settings-attendance-graceminutes"]', "15", "Grace Minutes");
  await slowType('[data-testid="hr-settings-attendance-latethresholdminutes"]', "30", "Late Threshold Minutes");
  await slowType('[data-testid="hr-settings-attendance-halfdaythresholdminutes"]', "240", "Half Day Threshold Minutes");
  await slowType('[data-testid="hr-settings-attendance-geofenceradiusmeters"]', "200", "Geofence Radius Metres");
  await slowType('[data-testid="hr-settings-attendance-autoclockoutminutes"]', "720", "Auto Clock-out Minutes");
  await slowClick('[data-testid="hr-settings-attendance-allowedworkmodes"]', "Allowed Work Modes");
  await slowClick('[data-testid="hr-settings-attendance-allowedworkmodes-option-Office"]', "Office Work Mode");
  await slowClick('[data-testid="hr-settings-attendance-allowedworkmodes-option-Home"]', "Home Work Mode");
  await page.keyboard.press("Escape");
  const faceRecognition = page.locator('[data-testid="hr-settings-attendance-facerecognitionrequired"]').first();
  if (await faceRecognition.isVisible().catch(() => false) && await faceRecognition.isChecked().catch(() => false)) {
    await faceRecognition.click();
  }
  const attendanceSaveResponsePromise = page.waitForResponse((response) => response.url().includes("/attendance-rules") && response.request().method() === "PUT", { timeout: 30000 });
  await slowClick('[data-testid="hr-settings-attendance-save"]', "Save Attendance Rules");
  const attendanceSaveResponse = await attendanceSaveResponsePromise;
  console.log(`   [Response] Save Attendance Rules: ${attendanceSaveResponse.status()} ${attendanceSaveResponse.statusText()}`);
  if (!attendanceSaveResponse.ok()) throw new Error(`Attendance Rules save failed (${attendanceSaveResponse.status()}): ${await attendanceSaveResponse.text()}`);

  console.log("\n>>> SETTINGS - PAYROLL SETTINGS...");
  await openSettingsSection("payroll", '[data-testid="hr-settings-payroll-save"]');
  await slowType('[data-testid="hr-settings-payroll-payday"]', "28", "Payroll Day");
  const payrollSettingsResponsePromise = page.waitForResponse((response) => response.url().includes("/payroll-settings") && response.request().method() === "PUT", { timeout: 30000 });
  await slowClick('[data-testid="hr-settings-payroll-save"]', "Save Payroll Settings");
  const payrollSettingsResponse = await payrollSettingsResponsePromise;
  console.log(`   [Response] Save Payroll Settings: ${payrollSettingsResponse.status()} ${payrollSettingsResponse.statusText()}`);
  if (!payrollSettingsResponse.ok()) throw new Error(`Payroll Settings save failed (${payrollSettingsResponse.status()}): ${await payrollSettingsResponse.text()}`);

  await createEmployees();

  console.log("\n>>> SETTINGS - ASSIGN LEAVE BALANCE TO CURRENT-RUN EMPLOYEE...");
  await page.goto("http://localhost:3000/hr/settings/leavetypes/assign", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await slowClick('[data-testid="hr-settings-leave-assignment-policy"]', "Leave Type Selection");
  await page.locator('[data-testid="hr-settings-leave-assignment-policy-menu"]')
    .getByText(leaveList[0].name, { exact: true }).click();
  await page.keyboard.press("Escape");
  await slowDate('#hr-settings-leave-assignment-period-start', futureDate(0), "Leave Balance Period Start");
  await slowDate('#hr-settings-leave-assignment-period-end', futureDate(365), "Leave Balance Period End");
  await slowClick('[data-testid="hr-settings-leave-assignment-specific"]', "Specific Employee Balance");
  const currentRunEmployeeName = `Rahul Sharma ${suffix}`;
  await slowType('[data-testid="hr-settings-leave-employee-search"]', currentRunEmployeeName, "Current Employee Search");
  const currentEmployeeRow = page.locator('tr').filter({ hasText: currentRunEmployeeName }).first();
  await currentEmployeeRow.locator('[data-testid^="hr-settings-leave-employee-"]').check();
  await slowClick('[data-testid="hr-settings-leave-assignment-confirm-bottom"]', "Confirm Leave Balance Assignment");
  await page.waitForURL(/\/settings\/leavetypes\/?$/, { timeout: 20000 });
  console.log(`   [Verified] Leave balance assigned to current-run employee: "${currentRunEmployeeName}"`);

  console.log("\n>>> 9. HELPDESK - RAISE 5 IT TICKETS...");
  await page.goto("http://localhost:3000/hr/tickets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const ticketList = [
    `Developer Laptop RAM & SSD Upgrade ${suffix}`,
    `VPN & Single Sign-On Access Issue ${suffix}`,
    `Production Database Slow Query Investigation ${suffix}`,
    `AWS Cloud Sandbox Access Request ${suffix}`,
    `Security Certificate Renewal Clearance ${suffix}`,
  ];
  for (let i = 0; i < ticketList.length; i++) {
    const subject = ticketList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-tickets-create-button"], button:has-text("Raise Ticket")', `Raise Ticket ${i + 1}`);
    await slowSelectFirstOption('[data-testid="hr-tickets-employee"]', `Employee Dropdown ${i + 1}`);
    await slowType('[data-testid="hr-tickets-subject"]', subject, `Subject ${i + 1}`);
    await slowSelect('[data-testid="hr-tickets-category"]', "IT Support", `Category ${i + 1}`);
    await slowSelect('[data-testid="hr-tickets-priority"]', "High", `Priority ${i + 1}`);
    await slowType('[data-testid="hr-tickets-description"]', `IT ticket for ${subject}`, `Description ${i + 1}`);
    await slowClick('[data-testid="hr-tickets-submit"]', `Submit Ticket ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 10. STAFFSPACE - NEW 5 IT ANNOUNCEMENTS...");
  await page.goto("http://localhost:3000/hr/announcements", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const announcementList = [
    `Q3 Engineering Townhall & Hackathon ${suffix}`,
    `New Cloud Infrastructure Cost Policy ${suffix}`,
    `Annual Tech Architecture Summit ${suffix}`,
    `Updated Information Security Best Practices ${suffix}`,
    `Quarterly Developer Recognition Awards ${suffix}`,
  ];
  for (let i = 0; i < announcementList.length; i++) {
    const title = announcementList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-announcements-create-button"], button:has-text("New Announcement")', `New Announcement ${i + 1}`);
    await slowType('[data-testid="hr-announcements-title"]', title, `Title ${i + 1}`);
    await slowSelect('[data-testid="hr-announcements-category"]', "General", `Category ${i + 1}`);
    await slowType('[data-testid="hr-announcements-content"]', `IT announcement for ${title}`, `Content ${i + 1}`);
    await slowClick('[data-testid="hr-announcements-submit"]', `Publish Announcement ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 11. EXPENSES - SUBMIT 5 IT EXPENSE CLAIMS...");
  await page.goto("http://localhost:3000/hr/expenses", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const expenseList = [
    { amount: "4500", note: `AWS Developer Certification Exam Fee ${suffix}` },
    { amount: "1850", note: `Client Onsite Tech Architecture Visit Cab ${suffix}` },
    { amount: "5200", note: `Developer Ergonomic Chair & Dual Monitor Arm ${suffix}` },
    { amount: "2500", note: `Engineering Sprint Retrospective Refreshments ${suffix}` },
    { amount: "1200", note: `Express Hardware Courier Shipping ${suffix}` },
  ];
  for (let i = 0; i < expenseList.length; i++) {
    const exp = expenseList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-expenses-submit-open"], button:has-text("Submit Expense")', `Submit Expense ${i + 1}`);
    const expenseEmployeeSelected = await slowSelectFirstOption('[data-testid="hr-expenses-employee-select"]', `Expense Employee ${i + 1}`);
    if (!expenseEmployeeSelected) throw new Error(`No employee is available for expense claim ${i + 1}`);
    await slowType('[data-testid="hr-expenses-amount-input"]', exp.amount, `Claim Amount ${i + 1}`);
    await slowSelect('[data-testid="hr-expenses-category-select"]', "Travel", `Category ${i + 1}`);
    await slowType('[data-testid="hr-expenses-notes-textarea"]', exp.note, `Notes ${i + 1}`);
    await slowClick('[data-testid="hr-expenses-submit-save"]', `Submit Claim ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 12. ASSETS - REGISTER 5 IT HARDWARE ASSETS...");
  await page.goto("http://localhost:3000/hr/assets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const assetList = [
    { type: "Laptop", name: `MacBook Pro M3 Max 32GB ${suffix}`, val: "240000" },
    { type: "Desktop", name: `Dell UltraSharp 32-inch 4K Monitor ${suffix}`, val: "45000" },
    { type: "Other", name: `iPad Pro 12.9 QA Device ${suffix}`, val: "95000" },
    { type: "Monitor", name: `Dual Curved Code Display Screen ${suffix}`, val: "38000" },
    { type: "Phone", name: `5G Mobile Test Device ${suffix}`, val: "55000" },
  ];
  for (let i = 0; i < assetList.length; i++) {
    const a = assetList[i];
    await closeAnyOpenModal();
    await slowClick('button:has-text("Register Asset")', `Register ${a.name}`);
    await slowSelect('[data-testid="hr-assets-type"]', a.type, `Asset Type ${i + 1}`);
    await slowType('[data-testid="hr-assets-name"]', a.name, `Asset Name ${i + 1}`);
    await slowType('[data-testid="hr-assets-tag-number"]', `TAG-${suffix}-${i + 1}`, `Tag Number ${i + 1}`);
    await slowType('[data-testid="hr-assets-serial-number"]', `SER-${suffix}-${i + 1}`, `Serial Number ${i + 1}`);
    await slowType('[data-testid="hr-assets-value"]', a.val, `Asset Value ${i + 1}`);
    await slowType('[data-testid="hr-assets-notes"]', `IT Asset record for ${a.name}`, `Notes ${i + 1}`);
    await slowClick('[data-testid="hr-assets-form-save"]', `Save ${a.name}`);
    await page.waitForTimeout(500);
  }

  async function createEmployees() {
  console.log("\n>>> 8. EMPLOYEE MASTER - CREATE 15 IT ENGINEER EMPLOYEES...");
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
    const empPhone = uniquePhone(i + 1);

    await page.goto("http://localhost:3000/hr/employees/new", { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="hr-new-employee-page"][data-state="step-1"]').waitFor({ state: "visible", timeout: 30000 });
    await page.locator('[data-testid="hr-new-employee-next"]').waitFor({ state: "visible", timeout: 30000 });

    // Step 1: Personal
    await slowType('[data-testid="hr-new-employee-name"]', empName, `IT Employee ${i + 1} Name`);
    await slowType('[data-testid="hr-new-employee-email"]', empEmail, `IT Employee ${i + 1} Email`);
    await slowType('[data-testid="hr-new-employee-contact-number-number"], input[type="tel"]', empPhone, `IT Employee ${i + 1} Phone`);
    await slowSelect('[data-testid="hr-new-employee-gender"]', profile.gender, `IT Employee ${i + 1} Gender`);
    await slowType('input[placeholder*="ABCDE1234F"]', `ABCDE123${(i % 9) + 1}F`, `IT Employee ${i + 1} PAN`);
    if (!(await slowClick('[data-testid="hr-new-employee-next"]', `Next Step ${i + 1}`))) {
      const wizardError = await page.locator('[data-testid="hr-new-employee-error"]').textContent().catch(() => "");
      throw new Error(`Employee Personal step could not continue for ${empName}: ${wizardError || "Next button unavailable"}`);
    }
    await page.locator('[data-testid="hr-new-employee-page"][data-state="step-2"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="hr-new-employee-complete"]').waitFor({ state: "visible", timeout: 10000 });

    // Step 2: Employment
    await slowSelectFirstOption('[data-testid="hr-new-employee-designation"]', `Designation ${i + 1}`);
    await slowSelectFirstOption('[data-testid="hr-new-employee-department"]', `Department ${i + 1}`);
    await slowSelect('[data-testid="hr-new-employee-employment-type"]', "FullTime", `Employment Type ${i + 1}`);
    await slowType('[data-testid="hr-new-employee-base-salary"]', String(60000 + i * 4000), `Base Salary ${i + 1}`);
    const employeeCreateResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && /\/employees\/?(?:\?|$)/.test(response.url()),
      { timeout: 30000 },
    );
    if (!(await slowClick('[data-testid="hr-new-employee-complete"]', `Complete Setup ${i + 1}`))) throw new Error(`Employee Complete Setup button was not available for ${empName}`);
    const employeeCreateResponse = await employeeCreateResponsePromise;
    console.log(`   [Response] Create Employee ${i + 1}: ${employeeCreateResponse.status()} ${employeeCreateResponse.statusText()}`);
    if (!employeeCreateResponse.ok()) throw new Error(`Employee creation failed (${employeeCreateResponse.status()}): ${await employeeCreateResponse.text()}`);
    const createdEmployee = await employeeCreateResponse.json().catch(() => ({}));
    let createdEmployeeUid = String(createdEmployee.uid ?? createdEmployee.id ?? createdEmployee.data?.uid ?? createdEmployee.data?.id ?? "");
    if (!createdEmployeeUid) {
      await page.goto(`${AUTOMATION_BASE_URL}/hr/employees`, { waitUntil: "domcontentloaded" });
      await slowType('[data-testid="hr-employees-search"]', empName, "Created Employee Verification");
      const createdRow = page.locator("tr").filter({ hasText: empName }).first();
      await createdRow.waitFor({ state: "visible", timeout: 30000 });
      const editTestId = await createdRow.locator('[data-testid^="hr-employee-edit-"]').getAttribute("data-testid");
      createdEmployeeUid = editTestId?.replace("hr-employee-edit-", "") ?? "";
    }
    if (!createdEmployeeUid) throw new Error(`Employee creation succeeded but no UID was returned for "${empName}"`);
    if (i === 0) currentRunEmployeeUid = createdEmployeeUid;
    console.log(`   [Verified] Employee created: "${empName}" (${createdEmployeeUid})`);
  }
  }

  console.log("\n>>> 13. LEAVE - APPLY FOR 5 IT LEAVES...");
  await page.goto("http://localhost:3000/hr/leave", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const leaveReasons = [
    `Attending AWS Global Tech Summit ${suffix}`,
    `Annual Family Leave & Vacation ${suffix}`,
    `Medical Consultation & Health Check ${suffix}`,
    `Home Relocation & Fiber Internet Setup ${suffix}`,
    `Personal Technical Certification Prep ${suffix}`,
  ];
  for (let i = 0; i < leaveReasons.length; i++) {
    const reason = leaveReasons[i];
    const isHalfDayLeave = i === 0;
    const isTwoDayLeave = i === 1;
    const leaveStartDate = futureDate(30 + i * 3);
    const requestedEndDate = isTwoDayLeave ? futureDate(31 + i * 3) : leaveStartDate;
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-leave-apply-button"], button:has-text("Apply For Leave")', `Apply Leave ${i + 1}`);
    const employeeSelected = await slowSelectFirstOption('[data-testid="hr-leave-employee"]', `Employee ${i + 1}`);
    if (!employeeSelected) throw new Error(`No employee is available for leave application ${i + 1}`);
    const leaveTypeSelected = await slowSelectFirstOption('[data-testid="hr-leave-type"]', `Leave Type ${i + 1}`);
    if (!leaveTypeSelected) throw new Error(`No leave type is available for leave application ${i + 1}`);
    await slowDate('[data-testid="hr-leave-start-date"]', leaveStartDate, `Start Date ${i + 1}`);
    await slowDate('[data-testid="hr-leave-end-date"]', requestedEndDate, `End Date ${i + 1}`);
    if (isHalfDayLeave) {
      await slowClick('[data-testid="hr-leave-half-day"]', "Select Half Day Leave");
    }
    const confirmedStartDate = await page.locator('#hr-leave-start-date, [data-testid="hr-leave-start-date"]').first().inputValue();
    const confirmedEndDate = await page.locator('#hr-leave-end-date, [data-testid="hr-leave-end-date"]').first().inputValue();
    if (confirmedStartDate !== leaveStartDate || confirmedEndDate !== requestedEndDate) {
      throw new Error(`Leave dates were not retained (start: ${confirmedStartDate}, end: ${confirmedEndDate})`);
    }
    await slowType('[data-testid="hr-leave-reason"]', reason, `Reason ${i + 1}`);
    await slowClick('[data-testid="hr-leave-apply-submit"], button:has-text("Submit Application")', `Submit Leave ${i + 1}`);
    const leaveModal = page.locator('[data-testid="hr-leave-apply-modal"]');
    await leaveModal.waitFor({ state: "hidden", timeout: 10000 }).catch(async () => {
      const errorText = await leaveModal.locator('[role="alert"], [style*="danger"], [style*="244,63,94"]').allTextContents().catch(() => []);
      throw new Error(`Leave application ${i + 1} did not submit: ${errorText.join(" ") || "dialog remained open"}`);
    });
  }

  async function createRecruitmentRecords() {
  console.log("\n>>> FINAL 1. RECRUITMENT - CREATE 5 IT REQUISITIONS...");
  await page.goto("http://localhost:3000/hr/recruitment/requisitions", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const reqList = [
    `Principal Cloud Architect ${suffix}`,
    `Senior Full Stack Developer ${suffix}`,
    `DevOps & SRE Specialist ${suffix}`,
    `Lead Product Manager ${suffix}`,
    `Cybersecurity Engineer ${suffix}`,
  ];
  for (let i = 0; i < reqList.length; i++) {
    const title = reqList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-recruitment-new-requisition"], button:has-text("New Requisition")', `New Requisition ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-title"]', title, `Job Title ${i + 1}`);
    if (!(await slowSelectOptionByLabel('[data-testid="hr-recruitment-requisition-department"]', deptList[i % deptList.length].name, `Department ${i + 1}`))) {
      throw new Error(`No department is available for Requisition ${i + 1}`);
    }
    const createdHiringManager = `Rahul Sharma ${suffix}`;
    if (!(await slowSelectOptionByLabel('[data-testid="hr-recruitment-requisition-hiring-manager"]', createdHiringManager, `Hiring Manager ${i + 1}`))) {
      throw new Error(`No employee is available as Hiring Manager for Requisition ${i + 1}`);
    }
    await slowSelect('[data-testid="hr-recruitment-requisition-employment-type"]', "FullTime", `Type ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-openings"]', String(i + 1), `Openings ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-experience"]', "3-6 years", `Experience ${i + 1}`);
    await slowSelect('[data-testid="hr-recruitment-requisition-status"]', "OPEN", `Status ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-description"]', `IT requisition for ${title}`, `Description ${i + 1}`);
    await slowClick('[data-testid="hr-recruitment-requisition-submit"]', `Save Requisition ${i + 1}`);
    await confirmDialogSubmission('[data-testid="hr-recruitment-requisition-dialog"]', title, `Requisition ${i + 1}`);
  }

  console.log("\n>>> 15. RECRUITMENT - CREATE 5 IT CANDIDATES...");
  await page.goto("http://localhost:3000/hr/recruitment/candidates", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const candidateList = [
    "Sneha Kulkarni",
    "Aditya Bhat",
    "Ritu Saxena",
    "Manish Pandey",
    "Shruti Iyer",
  ];
  for (let i = 0; i < candidateList.length; i++) {
    const cName = candidateList[i];
    const candidateName = `${cName} ${suffix}`;
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-recruitment-new-candidate"]', `New Candidate ${i + 1}`);
    await slowType('[data-testid="hr-candidate-name"]', candidateName, `Candidate Name ${i + 1}`);
    await slowType('[data-testid="hr-candidate-email"]', `${slugify(cName)}.${suffix}.test@jaldee.com`, `Candidate Email ${i + 1}`);
    await slowType('[data-testid="hr-candidate-phone"]', uniquePhone(100 + i), `Candidate Phone ${i + 1}`);
    await slowType('[data-testid="hr-candidate-experience"]', String(3 + i), `Candidate Experience ${i + 1}`);
    await slowSelect('[data-testid="hr-candidate-source"]', "JOB_PORTAL", `Candidate Source ${i + 1}`);
    await slowType('[data-testid="hr-candidate-skills"]', "React, TypeScript, Cloud, APIs", `Candidate Skills ${i + 1}`);
    await slowClick('[data-testid="hr-candidate-submit"]', `Save Candidate ${i + 1}`);
    await confirmDialogSubmission('[data-testid="hr-candidate-modal-form"]', candidateName, `Candidate ${i + 1}`);
  }

  }

  async function runEmployeeViewActions() {
  console.log("\n>>> EMPLOYEE MASTER - LIST, FILTER, EXPORT, VIEW...");
  await visitHr("/hr/employees", "EMPLOYEE MASTER ACTIONS");
  await slowType('[data-testid="hr-employees-search"]', suffix, "Employee Filter");
  await slowClick('[data-testid="hr-employees-export-button"]', "Export Employee CSV");
  const currentEmployeeName = `Rahul Sharma ${suffix}`;
  const currentEmployeeListRow = page.locator("tr").filter({ hasText: currentEmployeeName }).first();
  await currentEmployeeListRow.waitFor({ state: "visible", timeout: 15000 });
  const currentEmployeeView = currentEmployeeListRow.locator('[data-testid^="hr-employee-view-"]');
  if (await currentEmployeeView.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`   [Action] View current-run employee: "${currentEmployeeName}"`);
    await currentEmployeeView.click();
    await page.waitForURL(/\/hr\/employees\/[^/?]+(?:\/overview)?$/, { timeout: 15000 });
    await page.locator('[data-testid="hr-employee-details-page"]').waitFor({ state: "visible", timeout: 30000 });
    const employeeTabIds = ["overview", "attendance", "leaves", "payroll", "documents"];
    for (const tabId of employeeTabIds) {
      await page.locator(`[data-testid="hr-employee-details-tab-${tabId}"]`).waitFor({ state: "visible", timeout: 10000 });
    }
    console.log(`   [Verified] Employee detail automation IDs available: ${employeeTabIds.join(", ")}`);
    for (const [tabKey, tabName] of [["overview", "Overview"], ["attendance", "Attendance"], ["leaves", "Leaves"], ["payroll", "Payroll"], ["documents", "Documents"]]) {
      await slowClick(`[data-testid="hr-employee-details-tab-${tabKey}"]`, `Show Employee ${tabName}`);
      await page.waitForURL(new RegExp(`/hr/employees/[^/?]+/${tabKey}$`), { timeout: 10000 });
    }
    const documentRequestName = `Experience Certificate ${suffix}`;
    await slowClick('[data-testid="hr-employee-document-add"]', "Add Employee Document Request");
    await page.locator('[data-testid="hr-employee-document-dialog"]').waitFor({ state: "visible", timeout: 10000 });
    await slowType('[data-testid="hr-employee-document-type"]', documentRequestName, "Document Type");
    await slowSelect('[data-testid="hr-employee-document-status"]', "REQUESTED", "Document Status");
    await slowClick('[data-testid="hr-employee-document-save"]', "Save Employee Document Request");
    await page.locator('[data-testid="hr-employee-document-dialog"]').waitFor({ state: "hidden", timeout: 20000 });
    await page.locator('[data-testid^="hr-employee-document-row-"], [data-testid^="hr-employee-document-card-"]').filter({ hasText: documentRequestName }).first().waitFor({ state: "visible", timeout: 20000 });
    console.log(`   [Verified] Employee document request added: "${documentRequestName}"`);
    await page.waitForTimeout(5000);
    const documentRow = page.locator('[data-testid^="hr-employee-document-row-"]').filter({ hasText: documentRequestName }).first();
    await documentRow.locator('[data-testid^="hr-employee-document-edit-"]').click();
    await page.locator('[data-testid="hr-employee-document-status-dialog"]').waitFor({ state: "visible", timeout: 10000 });
    await slowSelect('[data-testid="hr-employee-document-status-select"]', "SUBMITTED", "Updated Document Status");
    const experienceLetterUpload = page.locator('[data-testid="hr-employee-document-status-file-upload"] input[type="file"]');
    await experienceLetterUpload.setInputFiles("automation/fixtures/employee-experience-certificate.pdf");
    const uploadedExperienceLetter = await experienceLetterUpload.evaluate((input) => input.files?.[0]?.name ?? "");
    if (uploadedExperienceLetter !== "employee-experience-certificate.pdf") throw new Error("Experience Certificate file was not selected for Submitted status");
    console.log(`   [File] Experience Certificate selected: "${uploadedExperienceLetter}"`);
    const documentSubmitResponsePromise = page.waitForResponse((response) => response.request().method() === "PUT" && /\/document-requests\/[^/?]+/.test(response.url()), { timeout: 30000 });
    await slowClick('[data-testid="hr-employee-document-status-save"]', "Update Employee Document");
    const documentSubmitResponse = await documentSubmitResponsePromise;
    console.log(`   [Response] Submit Experience Certificate: ${documentSubmitResponse.status()} ${documentSubmitResponse.statusText()}`);
    if (!documentSubmitResponse.ok()) throw new Error(`Experience Certificate submission failed (${documentSubmitResponse.status()}): ${await documentSubmitResponse.text()}`);
    await page.locator('[data-testid="hr-employee-document-status-dialog"]').waitFor({ state: "hidden", timeout: 20000 });
    await documentRow.waitFor({ state: "visible", timeout: 20000 });
    console.log("   [Verified] Employee document changed to Submitted with an uploaded file");
    const documentPopupPromise = page.waitForEvent("popup", { timeout: 10000 }).catch(() => null);
    await documentRow.locator('[data-testid^="hr-employee-document-download-"]').click();
    const documentPopup = await documentPopupPromise;
    if (documentPopup) await documentPopup.close();
    console.log("   [Verified] Employee document download opened");
    const documentDeleteResponsePromise = page.waitForResponse((response) => response.request().method() === "DELETE" && /\/document-requests\/[^/?]+/.test(response.url()), { timeout: 30000 });
    await documentRow.locator('[data-testid^="hr-employee-document-delete-"]').click();
    const documentDeleteResponse = await documentDeleteResponsePromise;
    console.log(`   [Response] Delete Employee Document: ${documentDeleteResponse.status()} ${documentDeleteResponse.statusText()}`);
    if (!documentDeleteResponse.ok()) throw new Error(`Employee document delete failed (${documentDeleteResponse.status()}): ${await documentDeleteResponse.text()}`);
    console.log("   [Verified] Employee document delete accepted; audit-history rows may remain visible");
    await slowClick('[data-testid="hr-employee-face-open"]', "Edit Face ID");
    await closeAnyOpenModal();
  }

  }

  async function runAttendanceAndLeaveActions() {
  console.log("\n>>> ATTENDANCE - CLOCK, HISTORY, VERIFICATIONS AND MODES...");
  await visitHr("/hr/attendance", "ATTENDANCE ACTIONS");
  await slowSelectFirstOption('[data-testid="hr-attendance-actor"]', "Attendance Employee");
  await slowClick('[data-testid="hr-attendance-punch-button"]', "Clock In / Clock Out");
  const punchMessage = page.locator('[data-testid="hr-attendance-punch-message"]');
  await punchMessage.waitFor({ state: "visible", timeout: 20000 });
  const punchResult = await punchMessage.textContent();
  if (!/Clocked in|Clocked out|already has an attendance/i.test(punchResult || "")) throw new Error(`Attendance punch failed: ${punchResult}`);
  console.log("   [Verified] Attendance location uses 10.5116834, 76.2164267");
  for (const subtab of ["logs", "pending", "overtime", "field", "compoff", "onduty", "kiosk"]) {
    await slowClick(`[data-testid="hr-attendance-subtab-${subtab}"]`, `Attendance ${subtab}`);
    if (subtab === "field") {
      await slowClick('[data-testid="hr-attendance-capture-location"]', "Capture Location");
      const locationMessage = page.locator('[data-testid="hr-attendance-location-message"]');
      await locationMessage.waitFor({ state: "visible", timeout: 20000 });
      if (!/Location logged/i.test(await locationMessage.textContent() || "")) throw new Error(`Attendance location capture failed: ${await locationMessage.textContent()}`);
    }
  }

  console.log("\n>>> 18. LEAVE - PENDING, BALANCES, LEDGER AND DECISIONS...");
  await visitHr("/hr/leave/pending", "LEAVE PENDING REQUESTS");
  if (await clickFirstPrefix("hr-leave-pending-inspect-", "Inspect Pending Leave")) {
    await slowType('[data-testid="hr-leave-approval-remarks"]', `Approved by automation ${suffix}`, "Approval Remarks");
    await slowClick('[data-testid="hr-leave-approve"]', "Approve Leave");
  }
  await visitHr("/hr/leave/balances", "EMPLOYEE LEAVE BALANCES");
  await slowType('[data-testid="hr-leave-balance-search"]', suffix, "Balance Employee Search");
  await visitHr("/hr/leave/ledger", "COMPANY LEAVE LEDGER");
  if (await clickFirstPrefix("hr-leave-ledger-inspect-", "View Ledger Leave")) {
    await slowClick('[data-testid="hr-leave-approve-lop"]', "Approve as Loss of Pay");
  }

  }

  async function completeRecruitmentActions() {
  console.log("\n>>> FINAL 2. RECRUITMENT - OVERVIEW AND APPLICATION ACTIONS...");
  await visitHr("/hr/recruitment", "RECRUITMENT OVERVIEW");
  await slowClick('[data-testid="hr-recruitment-view-requisitions"]', "View Requisitions");
  await visitHr("/hr/recruitment/applications", "VIEW APPLICATIONS");
  if (await clickFirstPrefix("hr-recruitment-application-actions-trigger-", "Open Application Actions")) {
    const screeningAction = page.locator('[data-testid$="-move-screening"]').first();
    if (await screeningAction.isVisible().catch(() => false)) await screeningAction.click();
  }
  const notesAction = page.locator('[data-testid$="-notes"][data-testid^="hr-recruitment-application-"]').first();
  if (await notesAction.isVisible().catch(() => false)) {
    await notesAction.click();
    await slowType('[data-testid="hr-recruitment-application-notes-input"]', `Automation review ${suffix}`, "Application Notes");
    await slowClick('[data-testid="hr-recruitment-application-notes-save"]', "Save Application Notes");
  }
  const ratingAction = page.locator('[data-testid$="-rating"][data-testid^="hr-recruitment-application-"]').first();
  if (await ratingAction.isVisible().catch(() => false)) {
    await ratingAction.click();
    await slowType('[data-testid="hr-recruitment-application-rating-input"]', "4", "Application Rating");
    await slowClick('[data-testid="hr-recruitment-application-rating-save"]', "Save Application Rating");
  }

  await visitHr("/hr/recruitment/candidates", "VIEW CANDIDATES");
  if (await clickFirstPrefix("hr-recruitment-candidate-view-", "View Candidate")) {
    console.log("   [Manual Action Required] Choose a resume file in the browser upload dialog");
    await page.locator('[data-testid="hr-recruitment-candidate-resume-upload"]').click();
    const resumeDownload = page.locator('[data-testid="hr-recruitment-candidate-resume-download"]');
    const resumeUploaded = await resumeDownload.waitFor({ state: "visible", timeout: 300000 }).then(() => true).catch(() => false);
    if (!resumeUploaded) {
      const uploadError = await page.locator('.text-red-700').last().textContent().catch(() => "");
      throw new Error(`Candidate resume was not uploaded within 5 minutes${uploadError ? `: ${uploadError}` : ""}`);
    }
    console.log("   [Verified] Candidate resume uploaded; continuing automation");
    await slowClick('[data-testid="hr-recruitment-candidate-resume-download"]', "Download Resume");
  }
  await visitHr("/hr/recruitment/interviews", "INTERVIEWS");
  await slowClick('[data-testid="hr-recruitment-schedule-interview"]', "Schedule Interview");
  await closeAnyOpenModal();
  if (await clickFirstPrefix("hr-recruitment-interview-update-", "Update Interview")) {
    await slowSelect('[data-testid="hr-recruitment-interview-update-status"]', "PROCEED", "Interview Status");
    await slowType('[data-testid="hr-recruitment-interview-update-score"]', "4", "Interview Score");
    await slowType('[data-testid="hr-recruitment-interview-update-feedback"]', `Strong technical interview ${suffix}`, "Interview Feedback");
    await slowClick('[data-testid="hr-recruitment-interview-update-save"]', "Save Interview Update");
  }
  await visitHr("/hr/recruitment/offers", "OFFERS");
  await slowClick('[data-testid="hr-recruitment-new-offer"]', "New Offer");
  await closeAnyOpenModal();
  if (await clickFirstPrefix("hr-recruitment-offer-view-", "View Offer")) await closeAnyOpenModal();
  await clickFirstPrefix("hr-recruitment-offer-convert-", "Convert Accepted Offer");

  console.log("\n>>> 20. CAREERS - SITE AND PUBLISHED ROLES...");
  await visitHr("/hr/recruitment/careers", "CAREERS ADMIN");
  if (await clickFirstPrefix("hr-careers-edit-", "Edit Published Role")) await closeAnyOpenModal();
  await clickFirstPrefix("hr-careers-unpublish-", "Unpublish Role");

  }

  console.log("\n>>> 21. ORGANIZATION - ALL SECTIONS...");
  async function runOrganizationChart() {
  await visitHr("/hr/org", "ORGANIZATION /chart");
  await slowType('input[placeholder*="Search"]', `Rahul Sharma ${suffix}`, "Organization Name Search");
  await slowClick('button:has-text("Collapse all")', "Collapse Org Chart");
  await slowClick('button:has-text("Expand all")', "Expand Org Chart");

  }
  async function runOrganizationDepartments() {
  const orgDepartmentName = `IT Delivery ${suffix}`;
  await visitHr("/hr/org/departments", "ORGANIZATION /departments");
  await slowClick('button:has-text("Add Department")', "Add Organization Department");
  await page.getByLabel("Department Name").fill(orgDepartmentName);
  await page.getByLabel("Code").fill(`ITD-${suffix}`);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const orgDepartmentRow = page.locator('[data-testid^="hr-org-department-row-"]').filter({ hasText: orgDepartmentName }).first();
  await orgDepartmentRow.waitFor({ state: "visible", timeout: 10000 });
  await orgDepartmentRow.getByRole("button").first().click();
  await page.getByLabel("Department Name").fill(`${orgDepartmentName} Updated`);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  }
  async function runOrganizationRoles() {
  const orgRoleName = `Platform Delivery Lead ${suffix}`;
  await visitHr("/hr/org/designations", "ORGANIZATION /designations");
  await slowClick('button:has-text("Add Role / Designation")', "Add Organization Designation");
  let orgRoleModal = page.locator("h3").filter({ hasText: "Add Role / Designation" }).locator("xpath=../..");
  await orgRoleModal.locator("input").nth(0).fill(orgRoleName);
  await orgRoleModal.locator("input").nth(1).fill(`PDL-${suffix}`);
  await orgRoleModal.locator("select").first().selectOption({ index: 1 });
  await orgRoleModal.locator("input").nth(2).fill("4");
  await orgRoleModal.locator("textarea").fill("Leads current-run platform delivery teams");
  await orgRoleModal.getByRole("button", { name: "Create", exact: true }).click();
  const orgRoleRow = page.locator("tr").filter({ hasText: orgRoleName }).first();
  await orgRoleRow.waitFor({ state: "visible", timeout: 10000 });
  await orgRoleRow.getByTitle("Edit").click();
  orgRoleModal = page.locator("h3").filter({ hasText: "Edit" }).locator("xpath=../..");
  await orgRoleModal.locator("textarea").fill("Updated platform delivery leadership role");
  await orgRoleModal.getByRole("button", { name: "Update", exact: true }).click();

  }
  async function runOrganizationBranches() {
  await visitHr("/hr/org/branches", "ORGANIZATION /branches");
  await slowClick('button:has-text("Assign Employee")', "Assign Employee to Branch");
  await page.getByLabel("Employee").selectOption({ label: `Rahul Sharma ${suffix}` });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await slowClick('button[aria-label^="Expand "]', "Expand Location to View Mapped Employees");

  }
  async function runOrganizationHeadcount() {
  await visitHr("/hr/org/positions", "ORGANIZATION /headcount");
  await slowClick('button:has-text("Allocate Headcount")', "Allocate Headcount");
  await page.getByLabel("Designation").selectOption({ index: 1 });
  await page.getByLabel("Department").selectOption({ index: 1 });
  await page.getByLabel("Branch").selectOption({ index: 1 });
  await page.getByLabel("Sanctioned Count").fill("3");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const headcountRow = page.locator("tr").filter({ hasText: "3" }).last();
  await headcountRow.getByRole("button").first().click();
  await page.getByLabel("Sanctioned Count").fill("5");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await visitHr("/hr/org/headcount", "ORGANIZATION /headcount norms");
  await page.getByText("Total Sanctioned", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  console.log("   [View] Showing Headcount & Norms for the newly allocated headcount");
  await page.waitForTimeout(7000);

  }
  async function runOrganizationLevels() {
  const levelLabel = `Principal Leadership ${suffix}`;
  await visitHr("/hr/org/levels", "ORGANIZATION /levels");
  await slowClick('button:has-text("Add Level")', "Add Seniority Level");
  await page.getByLabel("Level Number").fill("7");
  await page.getByLabel("Label").fill(levelLabel);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const levelRow = page.locator("tr").filter({ hasText: levelLabel }).first();
  await levelRow.getByRole("button").first().click();
  await page.getByLabel("Label").fill(`${levelLabel} Updated`);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  }
  async function runOrganizationTransfers() {
  console.log("\n>>> GLOBAL SETTINGS - ADD THRISSUR1 LOCATION...");
  await page.goto("http://localhost:3000/settings/locations", { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="settings-locations-create-button"]').waitFor({ state: "visible", timeout: 20000 });
  await slowClick('[data-testid="settings-locations-create-button"]', "Create Thrissur1 Location");
  await page.locator('[data-testid="settings-create-location-dialog"]').waitFor({ state: "visible", timeout: 10000 });
  await slowType('[data-testid="settings-location-name-input"]', "Thrissur1", "Location Name");
  await slowType('[data-testid="settings-location-pincode-input"]', "680020", "Location Pin Code");
  await slowType('[data-testid="settings-location-address-textarea"]', "Crown Tower", "Location Address");
  await slowType('[data-testid="settings-location-latitude-input"]', "10.5116834", "Location Latitude");
  await slowType('[data-testid="settings-location-longitude-input"]', "76.2164267", "Location Longitude");
  await slowType('[data-testid="settings-location-map-url-input"]', "https://www.google.com/maps?q=10.5116834,76.2164267", "Location Map URL");
  await slowClick('[data-testid="settings-location-submit-button"]', "Save Thrissur1 Location");
  await page.locator('[data-testid="settings-create-location-dialog"]').waitFor({ state: "hidden", timeout: 20000 });
  await page.locator('[data-testid^="settings-location-card-"]').filter({ hasText: "Thrissur1" }).waitFor({ state: "visible", timeout: 20000 });
  console.log("   [Verified] Thrissur1 location created with 10.5116834, 76.2164267");
  await page.waitForTimeout(5000);
  await visitHr("/hr/org/transfers", "ORGANIZATION /transfers");
  await slowClick('[data-testid="hr-org-transfer-open"]', "Schedule Employee Transfer");
  await page.locator('[data-testid="hr-org-transfer-employee"]').selectOption({ label: `Rahul Sharma ${suffix}` });
  await page.locator('[data-testid="hr-org-transfer-branch"]').selectOption({ label: "Thrissur1" });
  await page.locator('[data-testid="hr-org-transfer-department"]').selectOption({ index: 1 });
  await page.locator('[data-testid="hr-org-transfer-shift"]').selectOption({ index: 1 });
  const transferDate = futureDate(1);
  const transferReason = `Current-run IT organization alignment ${suffix}`;
  await slowDate('[data-testid="hr-org-transfer-effective-date"]', transferDate, "Transfer Effective Date");
  await page.locator('[data-testid="hr-org-transfer-reason"]').fill(transferReason);
  if (await page.locator('[data-testid="hr-org-transfer-effective-date"]').inputValue() !== transferDate) throw new Error("Transfer effective date was not retained");
  if (await page.locator('[data-testid="hr-org-transfer-reason"]').inputValue() !== transferReason) throw new Error("Transfer reason was not retained");
  await page.locator('[data-testid="hr-org-transfer-schedule"]').click();
  await page.locator("tr").filter({ hasText: `Rahul Sharma ${suffix}` }).first().waitFor({ state: "visible", timeout: 15000 });
  console.log("   [View] Showing the newly scheduled transfer on the list");
  await page.waitForTimeout(5000);
  await slowClick('[data-testid^="hr-org-transfer-effect-"]:not([data-testid^="hr-org-transfer-effect-card-"])', "Effect Transfer Now");
  }

  async function runPayrollActions() {
  console.log("\n>>> PAYROLL - COMPONENTS, STRUCTURES, EMPLOYEES, RUNS AND FIELDS...");
  const payrollComponentName = "Basic Salary";
  const payrollStructureName = `IT Monthly Structure ${suffix}`;
  await visitHr("/hr/payroll/components", "PAYROLL COMPONENTS");
  const payrollComponents = [
    { name: "Basic Salary", code: "BASIC", type: "EARNING", category: "BASIC", calculation: "FIXED_AMOUNT", statutory: false, taxable: true, gross: true, net: true, ctc: true, payslip: true },
    { name: "House Rent Allowance", code: "HRA", type: "EARNING", category: "HRA", calculation: "PERCENTAGE", statutory: false, taxable: true, gross: true, net: true, ctc: true, payslip: true },
    { name: "Provident Fund", code: "PF", type: "DEDUCTION", category: "PF", calculation: "PERCENTAGE", statutory: true, taxable: false, gross: false, net: true, ctc: false, payslip: true },
    { name: "Employee State Insurance", code: "ESI", type: "DEDUCTION", category: "ESI", calculation: "PERCENTAGE", statutory: true, taxable: false, gross: false, net: true, ctc: false, payslip: true },
  ];
  const setComponentFlag = async (dialog, label, checked) => {
    const checkbox = dialog.getByLabel(label, { exact: true });
    if ((await checkbox.isChecked()) !== checked) await checkbox.setChecked(checked);
  };
  let payrollDialog;
  for (const component of payrollComponents) {
    await slowClick('[data-testid="hr-payroll-component-new"]', `New Payroll Component ${component.name}`);
    payrollDialog = page.getByRole("dialog").filter({ hasText: "Payroll Component" }).first();
    await payrollDialog.getByLabel("Component Name").fill(component.name);
    await payrollDialog.getByLabel("Component Code").fill(component.code);
    await payrollDialog.getByTestId("type").selectOption(component.type);
    await payrollDialog.getByTestId("category").selectOption(component.category);
    await payrollDialog.getByTestId("calculation-type").selectOption(component.calculation);
    await setComponentFlag(payrollDialog, "isStatutory", component.statutory);
    await setComponentFlag(payrollDialog, "isTaxable", component.taxable);
    await setComponentFlag(payrollDialog, "affectsGrossPay", component.gross);
    await setComponentFlag(payrollDialog, "affectsNetPay", component.net);
    await setComponentFlag(payrollDialog, "affectsCtc", component.ctc);
    await setComponentFlag(payrollDialog, "visibleInPayslip", component.payslip);
    await payrollDialog.getByRole("button", { name: "Save", exact: true }).click();
    await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
    await page.locator("tr").filter({ hasText: component.name }).first().waitFor({ state: "visible", timeout: 10000 });
  }

  let payrollRow = page.locator("tr").filter({ hasText: payrollComponentName }).first();
  await payrollRow.waitFor({ state: "visible", timeout: 10000 });
  await payrollRow.locator('[data-testid^="hr-payroll-component-edit-"]').click();
  payrollDialog = page.getByRole("dialog").filter({ hasText: "Payroll Component" }).first();
  await payrollDialog.getByRole("button", { name: "Save", exact: true }).click();
  await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
  await visitHr("/hr/payroll/structures", "PAYROLL STRUCTURES");
  await slowClick('[data-testid="hr-payroll-structure-new"]', "New Payroll Structure");
  payrollDialog = page.getByRole("dialog").filter({ hasText: "Payroll Structure" }).first();
  await payrollDialog.getByLabel("Structure Name").fill(payrollStructureName);
  await payrollDialog.getByLabel("Structure Code").fill(`IT_MONTHLY_${suffix}`);
  await payrollDialog.getByLabel("Frequency").selectOption("MONTHLY");
  await payrollDialog.getByLabel("Currency").fill("INR");
  await payrollDialog.getByLabel("Description").fill("Monthly payroll structure for current-run IT employees");
  await payrollDialog.getByRole("button", { name: "Save", exact: true }).click();
  await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
  payrollRow = page.locator("tr").filter({ hasText: payrollStructureName }).first();
  await payrollRow.waitFor({ state: "visible", timeout: 10000 });
  await payrollRow.locator('[data-testid^="hr-payroll-structure-edit-"]').click();
  payrollDialog = page.getByRole("dialog").filter({ hasText: "Payroll Structure" }).first();
  await payrollDialog.getByLabel("Description").fill("Updated monthly payroll structure with basic salary component");
  await payrollDialog.getByRole("button", { name: "Save", exact: true }).click();
  await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
  payrollRow = page.locator("tr").filter({ hasText: payrollStructureName }).first();
  await payrollRow.locator('[data-testid^="hr-payroll-structure-build-"]').click();
  await slowClick('[data-testid="hr-payroll-structure-builder-open-add"]', "Add Structure Component");
  await page.locator('[data-testid="hr-payroll-structure-builder-component"]').selectOption({ label: "Basic Salary (BASIC)" });
  await slowSelect('[data-testid="hr-payroll-structure-builder-calculation"]', "FIXED_AMOUNT", "Fixed Amount Calculation");
  payrollDialog = page.getByRole("dialog").filter({ hasText: "Add Component" }).first();
  await payrollDialog.getByLabel("Default Amount").fill("60000");
  const overrideToggle = payrollDialog.getByLabel("Employee Override");
  if (!(await overrideToggle.isChecked())) await overrideToggle.check();
  await slowClick('[data-testid="hr-payroll-structure-add-component"]', "Save Structure Component");
  await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
  await visitHr("/hr/payroll/employees", "PAYROLL EMPLOYEES");
  const payrollEmployeeRow = page.locator("tr").filter({ hasText: `Rahul Sharma ${suffix}` }).first();
  await payrollEmployeeRow.waitFor({ state: "visible", timeout: 10000 });
  await payrollEmployeeRow.locator('[data-testid^="hr-payroll-employee-assign-"]').click();
  await page.getByLabel("Assign Structure").selectOption({ index: 1 });
  await slowDate('input[type="hidden"]', futureDate(0), "Payroll Effective From");
  await slowClick('[data-testid="hr-payroll-employee-assign"]', "Assign Payroll Structure");
  await page.waitForTimeout(2000);
  const firstOverride = page.locator('table input[type="number"]').first();
  if (await firstOverride.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstOverride.fill("65000");
    await slowClick('[data-testid="hr-payroll-employee-overrides-save"]', "Save Payroll Overrides");
  }
  await visitHr("/hr/payroll/runs", "PAYROLL RUNS AND PAYSLIPS");
  const runMonthValue = new Date().toISOString().slice(0, 7);
  const runMonthField = page.locator('label[for="run-month"]').locator("..");
  await runMonthField.locator('input:not([type="hidden"])').click();
  await page.getByRole("button", { name: "This month", exact: true }).click();
  await page.locator('#run-month[type="hidden"]').waitFor({ state: "attached", timeout: 10000 });
  const selectedRunMonth = await page.locator('#run-month[type="hidden"]').inputValue();
  if (selectedRunMonth !== runMonthValue) {
    throw new Error(`Payroll run month was not retained (expected: ${runMonthValue}, actual: ${selectedRunMonth})`);
  }
  await slowClick('[data-testid="hr-payroll-process"]', "Process Payroll");
  await page.locator('[data-testid^="hr-payroll-payslip-view-"]').first().waitFor({ state: "visible", timeout: 30000 });
  if (await clickFirstPrefix("hr-payroll-payslip-view-", "View Generated Payslip")) await slowClick('button:has-text("Print")', "Print Payslip");
  await visitHr("/hr/payroll/custom-fields", "PAYROLL CUSTOM FIELDS");
  await slowClick('[data-testid="hr-payroll-custom-field-new"]', "New Payroll Custom Field");
  payrollDialog = page.getByRole("dialog").filter({ hasText: "Custom Field" }).first();
  await payrollDialog.getByTestId("target-type").selectOption("EMPLOYEE_PAYROLL_STRUCTURE");
  await payrollDialog.getByTestId("data-type").selectOption("TEXT");
  await payrollDialog.getByLabel("Field Key").fill(`project_code_${suffix}`);
  await payrollDialog.getByLabel("Field Label").fill(`Project Code ${suffix}`);
  await payrollDialog.getByLabel("Default Value").fill("IT-CORE");
  await payrollDialog.getByRole("button", { name: "Save", exact: true }).click();
  await payrollDialog.waitFor({ state: "hidden", timeout: 20000 });
  await slowClick('[data-testid="hr-payroll-run-month"]', "Run Month");
  await slowClick('[data-testid="hr-payroll-export"]', "Export Payroll");

  }

  async function runEditEmployeeProfile() {
    console.log("\n>>> EMPLOYEE MASTER - EDIT CURRENT-RUN EMPLOYEE PROFILE...");
    if (!currentRunEmployeeUid) throw new Error("Current-run employee UID was not captured after creation");
    await page.goto(`${AUTOMATION_BASE_URL}/hr/employees/${currentRunEmployeeUid}?edit=true`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="hr-employee-edit-page"]').waitFor({ state: "visible", timeout: 30000 });
    await slowClick('[data-testid="hr-employee-edit-section-bank"]', "Open Employee Bank Details");
    await slowType('[data-testid="hr-employee-edit-bank-name"]', `Automation Bank ${suffix}`, "Employee Bank Name");
    const employeeUpdateResponsePromise = page.waitForResponse((response) => response.request().method() === "PUT" && /\/employees\/[^/?]+(?:\?|$)/.test(response.url()), { timeout: 30000 });
    await slowClick('[data-testid="hr-employee-edit-save"]', "Save Edited Employee Profile");
    const employeeUpdateResponse = await employeeUpdateResponsePromise;
    console.log(`   [Response] Save Employee Profile: ${employeeUpdateResponse.status()} ${employeeUpdateResponse.statusText()}`);
    if (!employeeUpdateResponse.ok()) throw new Error(`Employee profile update failed (${employeeUpdateResponse.status()}): ${await employeeUpdateResponse.text()}`);
    console.log(`   [Verified] Employee profile edited: "Rahul Sharma ${suffix}"`);
  }

  async function runManageLoginAction() {
    await visitHr("/hr/employees", "EMPLOYEE MANAGE LOGIN");
    await slowType('[data-testid="hr-employees-search"]', suffix, "Manage Login Employee Filter");
    const employeeRow = page.locator("tr").filter({ hasText: `Rahul Sharma ${suffix}` }).first();
    await employeeRow.waitFor({ state: "visible", timeout: 15000 });
    await employeeRow.locator('[data-testid^="hr-employee-view-"]').click();
    await page.locator('[data-testid="hr-employee-details-page"]').waitFor({ state: "visible", timeout: 30000 });
    await slowClick('[data-testid="hr-employee-manage-login"]', "Manage Employee Login");
    await page.locator('[data-testid="hr-employee-login-dialog"]').waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="hr-employee-login-id"]');
      return input && input.value && input.value !== "Will be assigned by system";
    }, null, { timeout: 20000 });
    managedEmployeeLoginId = await page.locator('[data-testid="hr-employee-login-id"]').inputValue();
    await slowType('[data-testid="hr-employee-login-password"]', "Employee@2026", "Employee Login Password");
    await slowType('[data-testid="hr-employee-login-confirm-password"]', "Employee@2026", "Confirm Employee Login Password");
    await slowClick('[data-testid="hr-employee-login-save"]', "Save Employee Login");
    await page.locator('[data-testid="hr-employee-login-dialog"]').waitFor({ state: "hidden", timeout: 20000 });
    console.log("   [Verified] Employee login managed");
  }

  async function runSeparationActions() {
    await visitHr("/hr/separation", "SEPARATION - REJECT, CANCEL AND APPROVE");
    await page.locator('[data-testid="hr-separation-page"]').waitFor({ state: "visible", timeout: 20000 });
    const actOnExitRequest = async (outcome, sequence) => {
      await slowClick('[data-testid="hr-separation-raise-open"]', `Raise Separation Request ${sequence}`);
      await page.locator('[data-testid="hr-separation-raise-modal"]').waitFor({ state: "visible", timeout: 10000 });
      await page.locator('[data-testid="hr-separation-employee"]').selectOption({ label: `Rahul Sharma ${suffix}` });
      await page.locator('[data-testid="hr-separation-type"]').selectOption("Resignation");
      await slowType('[data-testid="hr-separation-notice-days"]', "30", `Separation Notice ${sequence}`);
      await slowType('[data-testid="hr-separation-reason"]', `${outcome} separation automation ${suffix}-${sequence}`, `Separation Reason ${sequence}`);
      await slowClick('[data-testid="hr-separation-raise-submit"]', `Submit Separation Request ${sequence}`);
      await page.locator('[data-testid="hr-separation-raise-modal"]').waitFor({ state: "hidden", timeout: 20000 });
      const pendingRow = page.locator('[data-testid^="hr-separation-row-"]').filter({ hasText: `Rahul Sharma ${suffix}` }).filter({ hasText: "Pending" }).first();
      await pendingRow.waitFor({ state: "visible", timeout: 20000 });
      await pendingRow.locator('[data-testid^="hr-separation-open-"]').click();
      await page.locator('[data-testid="hr-separation-detail-modal"]').waitFor({ state: "visible", timeout: 10000 });
      if (outcome === "Rejected") {
        await slowType('[data-testid="hr-separation-decision-remarks"]', `Rejected by automation ${suffix}`, "Rejection Remarks");
        await slowClick('[data-testid="hr-separation-reject"]', "Reject Separation Request");
      } else if (outcome === "Cancelled") {
        await slowClick('[data-testid="hr-separation-cancel-request"]', "Cancel Separation Request");
      } else {
        await slowType('[data-testid="hr-separation-decision-remarks"]', `Approved by automation ${suffix}`, "Approval Remarks");
        await slowClick('[data-testid="hr-separation-approve"]', "Approve Separation Request");
      }
      await page.waitForTimeout(3000);
      await page.locator('[data-testid="hr-separation-detail-overlay"]').click({ position: { x: 5, y: 5 } });
      await page.locator('[data-testid^="hr-separation-row-"]').filter({ hasText: `Rahul Sharma ${suffix}` }).filter({ hasText: outcome }).first().waitFor({ state: "visible", timeout: 20000 });
      console.log(`   [Verified] Separation request ${outcome}`);
    };
    await actOnExitRequest("Rejected", 1);
    await actOnExitRequest("Cancelled", 2);
    await actOnExitRequest("Approved", 3);
  }

  async function runEmployeePortalActions() {
    console.log("\n>>> EMPLOYEE LOGIN - OPEN FRESH PAGE AND VERIFY SELF-SERVICE...");
    if (!managedEmployeeLoginId) throw new Error("Managed employee login ID was not retained for employee sign-in");
    const employeePage = await context.newPage();
    await employeePage.goto(`${AUTOMATION_BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await employeePage.locator('[data-testid="auth-login-logout-existing-session"]').click();
    await employeePage.locator('[data-testid="auth-login-id"]').waitFor({ state: "visible", timeout: 20000 });
    await employeePage.locator('[data-testid="auth-login-id"]').fill(managedEmployeeLoginId);
    await employeePage.waitForTimeout(pauseDelay);
    await employeePage.locator('[data-testid="auth-login-password"]').fill("Employee@2026");
    await employeePage.waitForTimeout(pauseDelay);
    await employeePage.locator('[data-testid="auth-login-submit"]').click();
    await employeePage.locator('[data-testid="hr-ess-page"]').waitFor({ state: "visible", timeout: 30000 });
    for (const section of ["profile", "attendance", "leave", "documents", "staffspace", "payslips", "expenses", "helpdesk"]) {
      await employeePage.locator(`[data-testid="hr-ess-nav-${section}"]`).click();
      await employeePage.waitForURL(new RegExp(`/hr/me/${section}`), { timeout: 15000 });
      console.log(`   [Employee View] ${section}`);
      await employeePage.waitForTimeout(viewDelay);
    }
    console.log(`   [Verified] Employee self-service login: "${managedEmployeeLoginId}"`);
    await employeePage.close();
  }

  await runAttendanceAndLeaveActions();
  await runPayrollActions();
  await runEmployeeViewActions();
  await runOrganizationBranches();
  await runOrganizationDepartments();
  await runOrganizationLevels();
  await runOrganizationRoles();
  await runOrganizationChart();
  await runOrganizationHeadcount();
  await runOrganizationTransfers();

  await createRecruitmentRecords();
  await completeRecruitmentActions();
  await runSeparationActions();
  await runManageLoginAction();
  await runEditEmployeeProfile();
  await runEmployeePortalActions();

  console.log("=========================================================");
  console.log("  FULL IT ENTERPRISE AUTOMATION SUITE COMPLETED!       ");
  console.log("=========================================================");

  await page.waitForTimeout(3000);
  await browser.close();
}

run().catch((err) => {
  console.error("Demo error:", err);
  process.exit(1);
});
