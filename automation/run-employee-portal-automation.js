const { chromium } = require("@playwright/test");

const BASE_URL = process.env.EMPLOYEE_PORTAL_BASE_URL || "http://localhost:3011";
const LOGIN_URL = `${BASE_URL}/ess/login`;
const COMPANY_ID = process.env.EMPLOYEE_COMPANY_ID || "jaldee";
const LOGIN_ID = process.env.EMPLOYEE_LOGIN_ID || "EMP9872";
const PASSWORD = process.env.EMPLOYEE_LOGIN_PASSWORD || "Netvarth@1";
const CAMERA_SELECTION_DELAY_MS = Number(process.env.EMPLOYEE_CAMERA_DELAY_MS || 10000);
const CLOCK_OUT_WAIT_MS = Number(process.env.EMPLOYEE_CLOCK_OUT_WAIT_MS || 120000);

async function run() {
  const headed = !process.argv.includes("--headless");
  const suffix = `${Date.now()}`.slice(-6);
  const delay = headed ? 2000 : 250;
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 200 : 0, args: ["--start-maximized"] });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: null });
  const page = await context.newPage();

  const pause = async (label) => {
    console.log(`   [View] ${label}`);
    await page.waitForTimeout(delay);
  };
  const click = async (selector, label, optional = false) => {
    const target = page.locator(selector).first();
    let visible = false;
    try {
      await target.waitFor({ state: "visible", timeout: optional ? 3000 : 20000 });
      visible = true;
    } catch {
      visible = false;
    }
    if (!visible) {
      if (optional) { console.log(`   [Skip] ${label}: not available`); return false; }
      throw new Error(`${label} was not available at ${page.url()}`);
    }
    console.log(`   [Action] ${label}`);
    await target.click();
    await pause(label);
    return true;
  };
  const fill = async (selector, value, label) => {
    const target = page.locator(selector).first();
    await target.waitFor({ state: "visible", timeout: 20000 });
    console.log(`   [Field] ${label}: "${value}"`);
    await target.fill(value);
    await page.waitForTimeout(headed ? 500 : 50);
  };
  const visitSection = async (section) => {
    await click(`[data-testid="hr-ess-nav-${section}"]`, `Open ${section}`);
    await page.waitForURL(new RegExp(`/ess/me/${section}(?:[/?#]|$)`), { timeout: 20000 });
  };
  const selectFirst = async (selector, label, optional = false) => {
    const select = page.locator(selector).first();
    await select.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForFunction(
      (targetSelector) => {
        const element = document.querySelector(targetSelector);
        if (!(element instanceof HTMLSelectElement)) return false;
        const hasOption = Array.from(element.options).some((item) => item.value && !item.disabled);
        const assignedLeaveMessage = document.body.textContent?.includes("No leave types are currently assigned to you.");
        return hasOption || assignedLeaveMessage;
      },
      selector,
      { timeout: 20000 }
    ).catch(() => {});
    const value = await select.locator("option").evaluateAll((items) => items.find((item) => item.value && !item.disabled)?.value || "");
    if (!value) {
      if (optional) {
        console.log(`   [Skip] ${label}: no assigned option is available`);
        return false;
      }
      throw new Error(`No option available for ${label}`);
    }
    await select.selectOption(value);
    console.log(`   [Select] ${label}: "${value}"`);
    return true;
  };
  const dateValue = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const chooseDate = async (id, value, label) => {
    const currentValue = await page.locator(`[data-testid="${id}"]`).inputValue().catch(() => "");
    await click(`[data-testid="${id}-display"]`, `Open ${label}`);
    const target = new Date(`${value}T12:00:00`);
    const initialView = currentValue ? new Date(`${currentValue}T12:00:00`) : new Date();
    const monthDifference = (target.getFullYear() - initialView.getFullYear()) * 12 + target.getMonth() - initialView.getMonth();
    const monthButton = monthDifference >= 0 ? "date-picker-next-month" : "date-picker-previous-month";
    if (monthDifference !== 0) console.log(`   [Calendar] Moving ${Math.abs(monthDifference)} month(s) to ${value}`);
    for (let index = 0; index < Math.abs(monthDifference); index += 1) {
      await page.locator(`[data-testid="${monthButton}"]`).click();
      await page.waitForTimeout(headed ? 150 : 25);
    }
    await click(`[data-testid="date-picker-day-${value}"]`, `Select ${label}: ${value}`);
  };

  console.log("=========================================================");
  console.log("  EMPLOYEE SELF-SERVICE AUTOMATION");
  console.log("=========================================================");

  page.on("response", (response) => {
    const resourceType = response.request().resourceType();
    if (resourceType === "fetch" || resourceType === "xhr") {
      console.log(`   [EMPLOYEE REST API] ${response.request().method()} ${response.url()} -> ${response.status()} ${response.statusText()}`);
    }
  });

  console.log("\n>>> EMPLOYEE LOGIN...");
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
  const existingSession = page.locator('[data-testid="ess-login-logout-existing-session"]');
  if (await existingSession.isVisible().catch(() => false)) await existingSession.click();
  await fill('[data-testid="ess-company-id"]', COMPANY_ID, "Company ID");
  await fill('[data-testid="ess-login-id"]', LOGIN_ID, "Employee Login ID");
  await fill('[data-testid="ess-login-password"]', PASSWORD, "Employee Password");
  await click('[data-testid="ess-login-submit"]', "Employee Sign In");
  await page.locator('[data-testid="hr-ess-page"]').waitFor({ state: "visible", timeout: 30000 });
  await pause("employee self-service overview");

  console.log("\n>>> PROFILE...");
  await visitSection("profile");

  console.log("\n>>> ATTENDANCE...");
  await visitSection("attendance");
  const mode = page.locator('[data-testid="ess-attendance-work-mode"]');
  if (await mode.isVisible().catch(() => false)) await mode.selectOption("Office");
  const location = page.locator('[data-testid="ess-attendance-location"]');
  if (await location.isVisible().catch(() => false)) await selectFirst('[data-testid="ess-attendance-location"]', "Attendance Location");
  if (await click('[data-testid="ess-attendance-punch-in"]', "Punch In", true)) {
    const faceDialog = page.locator('[data-testid="hr-face-capture-modal"]');
    if (await faceDialog.isVisible().catch(() => false)) {
      console.log(`   [Camera] Waiting ${CAMERA_SELECTION_DELAY_MS / 1000} seconds for camera selection and permission`);
      await page.waitForTimeout(CAMERA_SELECTION_DELAY_MS);
      const capture = page.locator('[data-testid="hr-face-capture-submit"]');
      const cameraReady = await capture.isEnabled({ timeout: 30000 }).catch(() => false);
      if (cameraReady) {
        await click('[data-testid="hr-face-capture-submit"]', "Capture Face and Punch In");
        await faceDialog.waitFor({ state: "hidden", timeout: 60000 });
        await pause("completed face verification");
      } else {
        console.log("   [Skip] Camera did not become ready; closing face verification");
        await page.locator('[data-testid="hr-face-capture-cancel"]').click();
      }
    }
  } else {
    await click('[data-testid="ess-attendance-punch-out"]', "Punch Out", true);
  }

  console.log("\n>>> APPLY FOR LEAVE...");
  await visitSection("leave");
  if (await click('[data-testid="ess-leave-apply-open"]', "Apply for Leave", true)) {
    const leaveTypeAvailable = await selectFirst('[data-testid="ess-leave-type"]', "Leave Type", true);
    if (leaveTypeAvailable) {
      const randomLeaveOffset = 14 + Math.floor(Math.random() * 167);
      const leaveDate = dateValue(randomLeaveOffset);
      console.log(`   [Random Date] Leave date selected ${randomLeaveOffset} days ahead: ${leaveDate}`);
      await chooseDate("ess-leave-start-date", leaveDate, "Leave Start Date");
      await chooseDate("ess-leave-end-date", leaveDate, "Leave End Date");
      await fill('[data-testid="ess-leave-reason"]', `Employee portal leave request ${suffix}`, "Leave Reason");
      await click('[data-testid="ess-leave-apply-submit"]', "Submit Leave Application");
      const leaveApplyModal = page.locator('[data-testid="ess-leave-apply-modal"]');
      const leaveSubmitted = await leaveApplyModal
        .waitFor({ state: "hidden", timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      if (!leaveSubmitted) {
        const leaveError = await leaveApplyModal
          .locator('.text-\\[\\#e11d48\\]')
          .first()
          .textContent()
          .catch(() => null);
        console.log(`   [Skip] Leave application was not submitted${leaveError?.trim() ? `: ${leaveError.trim()}` : ""}`);
        await click('[data-testid="ess-leave-apply-close"]', "Close Leave Application");
        await leaveApplyModal.waitFor({ state: "hidden", timeout: 10000 });
      }
    } else {
      await click('[data-testid="ess-leave-apply-close"]', "Close Leave Application");
    }
  }

  console.log("\n>>> DOCUMENTS...");
  await visitSection("documents");
  await pause("employee documents");

  console.log("\n>>> STAFF SPACE...");
  await visitSection("staffspace");
  await click('[data-testid^="hr-announcement-acknowledge-"]', "Acknowledge Announcement", true);

  console.log("\n>>> PAYSLIPS...");
  await visitSection("payslips");
  await page.locator('[data-testid="ess-payslips-table"]').waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const payslipView = page.locator('[data-testid^="ess-payslip-view-"]').first();
  if (await payslipView.isVisible().catch(() => false)) {
    await click('[data-testid^="ess-payslip-view-"]', "View Payslip");
    await page.locator('[data-testid="hr-payroll-payslip-print"]').waitFor({ state: "visible", timeout: 20000 });
    console.log("   [Verified] Payslip statement and Print Payslip action are available");
    await click('[data-testid="hr-payroll-payslip-dialog-close"]', "Close Payslip");
  } else {
    console.log("   [Skip] View Payslip: no generated payslip is available");
  }
  await pause("employee payslips");

  console.log("\n>>> SUBMIT EXPENSE CLAIM...");
  await visitSection("expenses");
  if (await click('[data-testid="hr-expenses-submit-open"]', "Submit Expense Claim", true)) {
    await fill('[data-testid="hr-expenses-amount-input"]', "1250", "Expense Amount");
    await page.locator('[data-testid="hr-expenses-category-select"]').selectOption("Food");
    console.log('   [Select] Expense Category: "Food"');
    await chooseDate("hr-expenses-date-input", dateValue(0), "Expense Date");
    await fill('[data-testid="hr-expenses-notes-textarea"]', `Employee business expense ${suffix}`, "Expense Notes");
    await click('[data-testid="hr-expenses-submit-save"]', "Submit Expense Claim");
  }

  console.log("\n>>> RAISE HELPDESK TICKET...");
  await visitSection("helpdesk");
  await click('[data-testid="hr-tickets-create-button"]', "Raise Ticket");
  const ticketSubject = `Employee portal assistance ${suffix}`;
  await fill('[data-testid="hr-tickets-subject"]', ticketSubject, "Ticket Subject");
  await page.locator('[data-testid="hr-tickets-category"]').selectOption({ index: 1 });
  console.log("   [Select] Ticket Category");
  await page.locator('[data-testid="hr-tickets-priority"]').selectOption("Medium");
  console.log('   [Select] Ticket Priority: "Medium"');
  await fill('[data-testid="hr-tickets-description"]', `Employee self-service support request ${suffix}`, "Ticket Description");
  const ticketResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && /\/tickets\/?(?:\?|$)/.test(response.url()),
    { timeout: 30000 }
  );
  await click('[data-testid="hr-tickets-submit"]', "Submit Ticket");
  const ticketResponse = await ticketResponsePromise;
  console.log(`   [Response] Raise Ticket: ${ticketResponse.status()} ${ticketResponse.statusText()}`);
  if (!ticketResponse.ok()) {
    throw new Error(`Raise Ticket failed (${ticketResponse.status()}): ${await ticketResponse.text()}`);
  }
  await page.locator('[data-testid="hr-tickets-create-modal"]').waitFor({ state: "hidden", timeout: 20000 });
  await page.getByText(ticketSubject, { exact: true }).first().waitFor({ state: "visible", timeout: 20000 });
  console.log(`   [Verified] Ticket raised: "${ticketSubject}"`);

  console.log(`\n>>> FINAL CLOCK OUT - WAITING ${Math.round(CLOCK_OUT_WAIT_MS / 60000)} MINUTE(S)...`);
  await page.waitForTimeout(CLOCK_OUT_WAIT_MS);
  await visitSection("attendance");
  const clockedOut = await click('[data-testid="ess-attendance-punch-out"]', "Final Clock Out", true);
  if (!clockedOut) console.log("   [Skip] Final Clock Out: no active attendance session is available");

  console.log("\n>>> EMPLOYEE LOGOUT...");
  await click('[data-testid="ess-logout"]', "Logout from ESS");
  await page.waitForURL(new RegExp("/ess/login(?:[/?#]|$)"), { timeout: 30000 });
  await page.locator('[data-testid="ess-login-submit"]').waitFor({ state: "visible", timeout: 30000 });
  console.log("   [Verified] ESS logout completed");

  console.log("=========================================================");
  console.log("  EMPLOYEE SELF-SERVICE AUTOMATION COMPLETED");
  console.log("=========================================================");
  await page.waitForTimeout(headed ? 3000 : 0);
  await browser.close();
}

run().catch((error) => {
  console.error("Employee portal automation error:", error);
  process.exit(1);
});
