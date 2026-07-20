const { chromium } = require("@playwright/test");

const LOGIN_ID = process.env.REAL_API_LOGIN_ID || "dhyanIT";
const PASSWORD = process.env.REAL_API_PASSWORD || "dhyanIT@1";

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function run() {
  const isHeaded = !process.argv.includes("--headless");
  const pauseDelay = 400;
  const suffix = `${Date.now()}`.slice(-6);

  console.log("=========================================================");
  console.log("  STARTING VISUAL IT ENTERPRISE HR AUTOMATION DEMO       ");
  console.log("=========================================================");

  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? 250 : 0,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: null,
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

  async function cleanupExistingRecords(scope) {
    let deleteBtns = page.locator(`[data-testid^="${scope}-delete-"], [data-testid^="${scope}"] button[title="Delete"], button[aria-label*="Delete"]`);
    let count = await deleteBtns.count().catch(() => 0);
    if (count > 0) {
      console.log(`   [Clean] Removing all ${count} pre-existing items for ${scope}...`);
    }
    let iterations = 0;
    while (count > 0 && iterations < 50) {
      iterations++;
      try {
        const firstBtn = deleteBtns.first();
        if (await firstBtn.isVisible().catch(() => false)) {
          await firstBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(350);
        } else {
          break;
        }
      } catch {
        break;
      }
      deleteBtns = page.locator(`[data-testid^="${scope}-delete-"], [data-testid^="${scope}"] button[title="Delete"], button[aria-label*="Delete"]`);
      const newCount = await deleteBtns.count().catch(() => 0);
      if (newCount === 0) break;
      count = newCount;
    }
    console.log(`   [Clean] ${scope} section is now completely empty!`);
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
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Date] Setting ${labelName}: "${dateStr}"`);
      await el.click().catch(() => {});
      await el.fill(dateStr).catch(() => {});
      await page.evaluate(({ sel, val }) => {
        const input = document.querySelector(sel);
        if (!input) return;

        let node = input;
        while (node) {
          const key = Object.keys(node).find((k) => k.startsWith("__reactFiber$"));
          if (key && node[key]) {
            let fiber = node[key];
            while (fiber) {
              if (fiber.memoizedProps && typeof fiber.memoizedProps.onChange === "function") {
                fiber.memoizedProps.onChange({ target: { value: val } });
                break;
              }
              fiber = fiber.return;
            }
          }
          node = node.parentElement;
        }

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (setter) setter.call(input, val);
        else input.value = val;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, { sel: selector, val: dateStr }).catch(() => {});
      await page.waitForTimeout(250);
      return true;
    }
    return false;
  }

  async function slowSelect(selector, value, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (labelName) console.log(`   [Select] Choosing ${labelName}: "${value}"`);
      await el.selectOption(value).catch(() => el.selectOption({ label: value })).catch(() => {});
      await page.waitForTimeout(250);
      return true;
    }
    return false;
  }

  async function slowSelectFirstOption(selector, labelName) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
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

  async function slowSaveModal(scope) {
    const modal = page.locator(`[data-testid="${scope}-modal"]`).or(page.locator('[role="dialog"]')).first();
    const saveBtn = modal.locator(`[data-testid="${scope}-save"], button:has-text("Save"), button:has-text("Create")`).first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`   [Action] Saving modal for ${scope}`);
      await saveBtn.click();
      await page.waitForTimeout(800);
      await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    } else {
      const fallbackBtn = page.locator(`[data-testid="${scope}-save"]`).first();
      if (await fallbackBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`   [Action] Saving modal fallback for ${scope}`);
        await fallbackBtn.click();
        await page.waitForTimeout(800);
      }
    }
  }

  console.log("\n>>> 1. AUTHENTICATION & LOGIN FORM...");
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await slowType('input[name="username"], input[type="text"], [data-testid="login-id-input"], input[placeholder*="Login"]', LOGIN_ID, "Login ID");
  await slowType('input[type="password"]', PASSWORD, "Password");
  await slowClick('button[type="submit"], button:has-text("Sign in")', "Sign In Button");
  await page.waitForTimeout(2000);

  console.log("\n>>> 2. SETTINGS - COMPANY PROFILE FORM (IT TECH ENTERPRISE)...");
  await page.goto("http://127.0.0.1:3000/hr/settings/company", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await slowType('[data-testid="hr-settings-company-name"], input[name="name"]', `Dhyandarsh IT Technologies ${suffix}`, "Company Name");
  await slowType('[data-testid="hr-settings-company-legalname"]', "Dhyandarsh IT Technologies Private Limited", "Legal Name");
  await slowType('[data-testid="hr-settings-company-industry"]', "Information Technology & Enterprise Software", "Industry");
  await slowType('[data-testid="hr-settings-company-email"]', `corporate.${suffix}.test@jaldee.com`, "Contact Email");
  await slowType('[data-testid="hr-settings-company-phone"]', "5555000000", "Phone");
  await slowType('[data-testid="hr-settings-company-addressline"]', "Tech Park Tower B, Outer Ring Road", "Address");
  await slowType('[data-testid="hr-settings-company-city"]', "Bangalore", "City");
  await slowType('[data-testid="hr-settings-company-state"]', "Karnataka", "State");
  await slowType('[data-testid="hr-settings-company-country"]', "India", "Country");
  await slowType('[data-testid="hr-settings-company-gstin"]', "29ABCDE1234F1Z5", "GSTIN");
  await slowType('[data-testid="hr-settings-company-pan"]', "ABCDE1234F", "PAN");
  await slowSelect('[data-testid="hr-settings-company-currency"]', "INR", "Currency");
  await slowType('[data-testid="hr-settings-company-workingdays"]', "Monday - Friday", "Working Days");
  await slowClick('[data-testid="hr-settings-company-save"], button:has-text("Save Changes")', "Save Company Profile");
  await page.waitForTimeout(1000);

  console.log("\n>>> 3. SETTINGS - ADD 5 IT DEPARTMENTS...");
  await page.goto("http://127.0.0.1:3000/hr/settings/departments", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await cleanupExistingRecords("hr-settings-departments");
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
    await slowClick('[data-testid="hr-settings-departments-add"], button:has-text("Add Department")', `Add ${d.name}`);
    await slowType('[data-testid="hr-settings-departments-name"]', d.name, `Dept Name ${i + 1}`);
    await slowType('[data-testid="hr-settings-departments-code"]', d.code, `Dept Code ${i + 1}`);
    await slowSaveModal("hr-settings-departments");
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 4. SETTINGS - ADD 5 IT ROLES / DESIGNATIONS...");
  await page.goto("http://127.0.0.1:3000/hr/settings/designations", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await cleanupExistingRecords("hr-settings-designations");
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
    await slowClick('[data-testid="hr-settings-designations-add"], button:has-text("Add Role")', `Add ${r.name}`);
    await slowType('[data-testid="hr-settings-designations-name"]', r.name, `Role Name ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-code"]', r.code, `Role Code ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-level"]', r.level, `Seniority Level ${i + 1}`);
    await slowType('[data-testid="hr-settings-designations-description"]', r.desc, `Description ${i + 1}`);
    await slowSelectFirstOption('[data-testid="hr-settings-designations-hrdepartmentuid"]', `Department Dropdown ${i + 1}`);
    await slowSaveModal("hr-settings-designations");
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 5. SETTINGS - ADD 5 IT SHIFTS...");
  await page.goto("http://127.0.0.1:3000/hr/settings/shifts", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await cleanupExistingRecords("hr-settings-shifts");
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
    await slowClick('[data-testid="hr-settings-shifts-add"], button:has-text("Add Shift")', `Add ${s.name}`);
    await slowType('[data-testid="hr-settings-shifts-name"]', s.name, `Shift Name ${i + 1}`);
    await slowTime("hr-settings-shifts-starttime", s.start, `Start Time ${i + 1}`);
    await slowTime("hr-settings-shifts-endtime", s.end, `End Time ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-graceminutes"]', "15", `Grace Minutes ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-halfdaythresholdminutes"]', "240", `Half-Day Threshold ${i + 1}`);
    await slowType('[data-testid="hr-settings-shifts-breakminutes"]', "45", `Break Minutes ${i + 1}`);
    await slowSaveModal("hr-settings-shifts");
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 6. SETTINGS - CREATE 5 IT LEAVE TYPES...");
  await page.goto("http://127.0.0.1:3000/hr/settings/leavetypes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await cleanupExistingRecords("hr-settings-leave-policy");
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
    await slowClick('[data-testid="hr-settings-leave-policy-create"], button:has-text("Create New Leave Type")', `Create ${l.name}`);
    await slowType('[data-testid="hr-settings-leave-policy-name"]', l.name, `Leave Name ${i + 1}`);
    await slowSelect('[data-testid="hr-settings-leave-policy-category"]', l.cat, `Category ${i + 1}`);
    await slowType('[data-testid="hr-settings-leave-policy-quota"]', l.quota, `Quota ${i + 1}`);
    await slowSelect('[data-testid="hr-settings-leave-policy-accrual"]', "Monthly", `Accrual ${i + 1}`);
    await slowSaveModal("hr-settings-leave-policy");
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 7. SETTINGS - ADD 5 IT HOLIDAYS...");
  await page.goto("http://127.0.0.1:3000/hr/settings/holidays", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await cleanupExistingRecords("hr-settings-holidays");
  const holidayList = [
    { name: `Republic Day ${suffix}`, date: "2026-01-26" },
    { name: `Independence Day ${suffix}`, date: "2026-08-15" },
    { name: `Gandhi Jayanti ${suffix}`, date: "2026-10-02" },
    { name: `Karnataka Rajyotsava ${suffix}`, date: "2026-11-01" },
    { name: `Christmas Day ${suffix}`, date: "2026-12-25" },
  ];
  for (let i = 0; i < holidayList.length; i++) {
    const h = holidayList[i];
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-settings-holidays-add"], button:has-text("Add Holiday")', `Add ${h.name}`);
    await slowType('[data-testid="hr-settings-holidays-name"]', h.name, `Holiday Name ${i + 1}`);
    await slowDate('[data-testid="hr-settings-holidays-date"]', h.date, `Holiday Date ${i + 1}`);
    await slowSelect('[data-testid="hr-settings-holidays-type"]', "Public", `Holiday Type ${i + 1}`);
    await slowSaveModal("hr-settings-holidays");
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 8. HELPDESK - RAISE 5 IT TICKETS...");
  await page.goto("http://127.0.0.1:3000/hr/tickets", { waitUntil: "domcontentloaded" });
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
    await slowSelect('[data-testid="hr-tickets-category"]', "IT/Systems", `Category ${i + 1}`);
    await slowSelect('[data-testid="hr-tickets-priority"]', "High", `Priority ${i + 1}`);
    await slowType('[data-testid="hr-tickets-description"]', `IT ticket for ${subject}`, `Description ${i + 1}`);
    await slowClick('[data-testid="hr-tickets-submit"]', `Submit Ticket ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 9. STAFFSPACE - NEW 5 IT ANNOUNCEMENTS...");
  await page.goto("http://127.0.0.1:3000/hr/announcements", { waitUntil: "domcontentloaded" });
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

  console.log("\n>>> 10. EXPENSES - SUBMIT 5 IT EXPENSE CLAIMS...");
  await page.goto("http://127.0.0.1:3000/hr/expenses", { waitUntil: "domcontentloaded" });
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
    await slowType('[data-testid="hr-expenses-amount-input"]', exp.amount, `Claim Amount ${i + 1}`);
    await slowSelect('[data-testid="hr-expenses-category-select"]', "Travel", `Category ${i + 1}`);
    await slowType('[data-testid="hr-expenses-notes-textarea"]', exp.note, `Notes ${i + 1}`);
    await slowClick('[data-testid="hr-expenses-submit-save"]', `Submit Claim ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 11. ASSETS - REGISTER 5 IT HARDWARE ASSETS...");
  await page.goto("http://127.0.0.1:3000/hr/assets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const assetList = [
    { type: "Laptop", name: `MacBook Pro M3 Max 32GB ${suffix}`, val: "240000" },
    { type: "Desktop", name: `Dell UltraSharp 32-inch 4K Monitor ${suffix}`, val: "45000" },
    { type: "Tablet", name: `iPad Pro 12.9 QA Device ${suffix}`, val: "95000" },
    { type: "Monitor", name: `Dual Curved Code Display Screen ${suffix}`, val: "38000" },
    { type: "Mobile", name: `5G Mobile Test Device ${suffix}`, val: "55000" },
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

  console.log("\n>>> 12. EMPLOYEE MASTER - CREATE 15 IT ENGINEER EMPLOYEES...");
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
    const empPhone = `5555${String(i + 1).padStart(6, "0")}`;

    await page.goto("http://127.0.0.1:3000/hr/employees/new", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // Step 1: Personal
    await slowType('input[placeholder*="John Doe"], input[name="name"]', empName, `IT Employee ${i + 1} Name`);
    await slowType('input[placeholder*="john@example.com"], input[name="email"]', empEmail, `IT Employee ${i + 1} Email`);
    await slowType('[data-testid="hr-new-employee-contact-number-number"], input[type="tel"]', empPhone, `IT Employee ${i + 1} Phone`);
    await slowSelect('[data-testid="hr-new-employee-gender"]', profile.gender, `IT Employee ${i + 1} Gender`);
    await slowType('input[placeholder*="ABCDE1234F"]', `ABCDE123${(i % 9) + 1}F`, `IT Employee ${i + 1} PAN`);
    await slowClick('button:has-text("Next step")', `Next Step ${i + 1}`);

    // Step 2: Employment
    await slowSelectFirstOption('[data-testid="hr-new-employee-designation"]', `Designation ${i + 1}`);
    await slowSelectFirstOption('[data-testid="hr-new-employee-department"]', `Department ${i + 1}`);
    await slowSelect('[data-testid="hr-new-employee-employment-type"]', "FullTime", `Employment Type ${i + 1}`);
    await slowType('[data-testid="hr-new-employee-base-salary"]', String(60000 + i * 4000), `Base Salary ${i + 1}`);
    await slowClick('button:has-text("Complete Setup")', `Complete Setup ${i + 1}`);
    await page.waitForTimeout(600);
  }

  console.log("\n>>> 13. LEAVE - APPLY FOR 5 IT LEAVES...");
  await page.goto("http://127.0.0.1:3000/hr/leave", { waitUntil: "domcontentloaded" });
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
    await closeAnyOpenModal();
    await slowClick('[data-testid="hr-leave-apply-button"], button:has-text("Apply For Leave")', `Apply Leave ${i + 1}`);
    await slowDate('[data-testid="hr-leave-start-date"]', "2026-08-01", `Start Date ${i + 1}`);
    await slowDate('[data-testid="hr-leave-end-date"]', "2026-08-02", `End Date ${i + 1}`);
    await slowType('[data-testid="hr-leave-reason"]', reason, `Reason ${i + 1}`);
    await slowClick('[data-testid="hr-leave-apply-submit"], button:has-text("Submit Application")', `Submit Leave ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 14. RECRUITMENT - CREATE 5 IT REQUISITIONS...");
  await page.goto("http://127.0.0.1:3000/hr/recruitment/requisitions", { waitUntil: "domcontentloaded" });
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
    await slowSelect('[data-testid="hr-recruitment-requisition-employment-type"]', "FullTime", `Type ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-openings"]', String(i + 1), `Openings ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-experience"]', "3-6 years", `Experience ${i + 1}`);
    await slowType('[data-testid="hr-recruitment-requisition-description"]', `IT requisition for ${title}`, `Description ${i + 1}`);
    await slowClick('[data-testid="hr-recruitment-requisition-submit"]', `Save Requisition ${i + 1}`);
    await page.waitForTimeout(500);
  }

  console.log("\n>>> 15. RECRUITMENT - CREATE 5 IT CANDIDATES...");
  await page.goto("http://127.0.0.1:3000/hr/recruitment/candidates", { waitUntil: "domcontentloaded" });
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
    await slowType('[data-testid="hr-candidate-phone"]', `5555${String(i + 1).padStart(6, "0")}`, `Candidate Phone ${i + 1}`);
    await slowType('[data-testid="hr-candidate-experience"]', String(3 + i), `Candidate Experience ${i + 1}`);
    await slowClick('[data-testid="hr-candidate-submit"]', `Save Candidate ${i + 1}`);
    await page.waitForTimeout(500);
  }

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
