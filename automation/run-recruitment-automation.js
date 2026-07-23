const { chromium } = require("@playwright/test");

const BASE_URL = process.env.AUTOMATION_BASE_URL || "http://localhost:3000";
const LOGIN_ID = process.env.RECRUITMENT_LOGIN_ID || process.env.AUTOMATION_LOGIN_ID || "jaldeesoft";
const PASSWORD = process.env.RECRUITMENT_PASSWORD || process.env.AUTOMATION_PASSWORD || "jaldeeSoft@1";
const RESUME_FILE = process.env.RECRUITMENT_RESUME_FILE || "automation/fixtures/employee-experience-certificate.pdf";

async function run() {
  const headed = !process.argv.includes("--headless");
  const suffix = `${Date.now()}`.slice(-6);
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 250 : 0, args: ["--start-maximized"] });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: null });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  const visiblePause = headed ? 2000 : 300;
  const pause = async (label) => {
    if (headed) console.log(`   [Wait] Showing ${label} for 2 seconds`);
    await page.waitForTimeout(visiblePause);
  };
  const visit = async (path, label) => {
    console.log(`\n>>> ${label}...`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await pause(label);
  };

  const action = async (selector, label, optional = false) => {
    const target = page.locator(selector).first();
    let visible = false;
    try {
      await target.waitFor({ state: "visible", timeout: optional ? 3000 : 20000 });
      visible = true;
    } catch {
      visible = false;
    }
    if (!visible) {
      if (optional) {
        console.log(`   [Skip] ${label}: unavailable`);
        return false;
      }
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
  };

  const selectFirst = async (selector, label) => {
    const target = page.locator(selector).first();
    await target.waitFor({ state: "visible", timeout: 20000 });
    const value = await target.locator("option").evaluateAll((options) => options.find((option) => option.value && !option.disabled)?.value || "");
    if (!value) throw new Error(`No option is available for ${label}`);
    await target.selectOption(value);
    console.log(`   [Select] ${label}: "${value}"`);
  };

  console.log("=========================================================");
  console.log("  RECRUITMENT-ONLY AUTOMATION                           ");
  console.log("=========================================================");

  console.log("\n>>> LOGIN TO EXISTING ACCOUNT...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await fill('[data-testid="auth-login-id"]', LOGIN_ID, "Login ID");
  await fill('[data-testid="auth-login-password"]', PASSWORD, "Password");
  await action('[data-testid="auth-login-submit"]', "Sign In");
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
  console.log(`   [Verified] Logged in as "${LOGIN_ID}"`);
  await pause("logged-in page");

  await visit("/hr/recruitment/requisitions", "CREATE ONE REQUISITION");
  const requisitionsError = page.locator('[data-testid="hr-recruitment-requisitions-error"]');
  if (await requisitionsError.isVisible().catch(() => false)) {
    throw new Error(`Requisitions page failed to load: ${(await requisitionsError.innerText()).replace(/\s+/g, " ").trim()}`);
  }
  await page.locator('[data-testid="hr-recruitment-requisitions-page"]').waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  await action('[data-testid="hr-recruitment-new-requisition"]', "New Requisition");
  const requisitionTitle = `Automation Software Engineer ${suffix}`;
  await fill('[data-testid="hr-recruitment-requisition-title"]', requisitionTitle, "Requisition Title");
  await selectFirst('[data-testid="hr-recruitment-requisition-department"]', "Department");
  await selectFirst('[data-testid="hr-recruitment-requisition-hiring-manager"]', "Hiring Manager");
  await page.locator('[data-testid="hr-recruitment-requisition-employment-type"]').selectOption("FullTime");
  await fill('[data-testid="hr-recruitment-requisition-openings"]', "1", "Openings");
  await fill('[data-testid="hr-recruitment-requisition-experience"]', "3-5 years", "Experience");
  await page.locator('[data-testid="hr-recruitment-requisition-status"]').selectOption("OPEN");
  await fill('[data-testid="hr-recruitment-requisition-description"]', `Recruitment-only automation ${suffix}`, "Description");
  const requisitionResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && /\/recruitment\/requisitions\/?(?:\?|$)/.test(response.url()), { timeout: 30000 });
  await action('[data-testid="hr-recruitment-requisition-submit"]', "Save Requisition");
  const requisitionResponse = await requisitionResponsePromise;
  console.log(`   [Response] Create Requisition: ${requisitionResponse.status()} ${requisitionResponse.statusText()}`);
  if (!requisitionResponse.ok()) throw new Error(`Requisition creation failed: ${await requisitionResponse.text()}`);
  await page.locator('[data-testid="hr-recruitment-requisition-dialog"]').waitFor({ state: "hidden", timeout: 30000 });
  await page.locator("tr").filter({ hasText: requisitionTitle }).first().waitFor({ state: "visible", timeout: 30000 });
  await pause("created requisition in the list");

  console.log("\n>>> PUBLISH REQUISITION AND APPLY FROM PUBLIC LINK...");
  const requisitionRow = page.locator("tr").filter({ hasText: requisitionTitle }).first();
  await requisitionRow.locator('[data-testid^="hr-recruitment-publish-"]').click();
  await page.locator('[data-testid="hr-careers-publish-page"]').waitFor({ state: "visible", timeout: 30000 });
  await pause("careers publishing page");
  await action('[data-testid="hr-careers-template-classic"]', "Choose Classic Template");
  await action('[data-testid="hr-careers-publish-get-link"]', "Publish and Get Link");
  await page.locator('[data-testid="hr-careers-publish-success"]').waitFor({ state: "visible", timeout: 30000 });
  const publicLink = (await page.locator('[data-testid="hr-careers-generated-link"]').innerText()).trim();
  console.log(`   [Generated Link] ${publicLink}`);
  await pause("generated public careers link");

  const popupPromise = context.waitForEvent("page");
  await page.locator('[data-testid="hr-careers-open-public-page"]').click();
  const publicPage = await popupPromise;
  await publicPage.waitForLoadState("domcontentloaded");
  await publicPage.locator('[data-testid="careers-public-application-card"]').waitFor({ state: "visible", timeout: 30000 });
  await publicPage.waitForTimeout(visiblePause);
  const publicCandidateName = `Public Candidate ${suffix}`;
  await publicPage.locator('[data-testid="careers-public-candidate-name"]').fill(publicCandidateName);
  await publicPage.locator('[data-testid="careers-public-candidate-email"]').fill(`public.${suffix}.test@jaldee.com`);
  await publicPage.locator('[data-testid="careers-public-candidate-phone"]').fill(`5555${suffix}`);
  await publicPage.locator('[data-testid="careers-public-candidate-resume"]').setInputFiles(RESUME_FILE);
  await publicPage.locator('[data-testid="careers-public-candidate-consent"]').check();
  console.log(`   [Candidate] Public application: "${publicCandidateName}" with resume`);
  await publicPage.waitForTimeout(visiblePause);
  await publicPage.locator('[data-testid="careers-public-candidate-submit"]').click();
  await publicPage.locator('[data-testid="careers-public-application-success"]').waitFor({ state: "visible", timeout: 60000 });
  console.log("   [Verified] Public candidate application submitted");
  await publicPage.waitForTimeout(visiblePause);
  await publicPage.close();
  await page.bringToFront();
  console.log("   [Return] Back to authenticated recruitment automation");
  await pause("authenticated recruitment page");

  await visit("/hr/recruitment/candidates", "CREATE ONE CANDIDATE");
  await action('[data-testid="hr-recruitment-new-candidate"]', "New Candidate");
  const candidateName = `Recruitment Candidate ${suffix}`;
  await fill('[data-testid="hr-candidate-name"]', candidateName, "Candidate Name");
  await fill('[data-testid="hr-candidate-email"]', `candidate.${suffix}.test@jaldee.com`, "Candidate Email");
  await fill('[data-testid="hr-candidate-phone"]', `5555${suffix}`, "Candidate Phone");
  await fill('[data-testid="hr-candidate-experience"]', "4", "Candidate Experience");
  await page.locator('[data-testid="hr-candidate-source"]').selectOption("JOB_PORTAL");
  await fill('[data-testid="hr-candidate-skills"]', "React, TypeScript, Cloud", "Candidate Skills");
  const candidateResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && /\/recruitment\/candidates\/?(?:\?|$)/.test(response.url()), { timeout: 30000 });
  await action('[data-testid="hr-candidate-submit"]', "Save Candidate");
  const candidateResponse = await candidateResponsePromise;
  console.log(`   [Response] Create Candidate: ${candidateResponse.status()} ${candidateResponse.statusText()}`);
  if (!candidateResponse.ok()) throw new Error(`Candidate creation failed: ${await candidateResponse.text()}`);

  await page.locator('[data-testid="hr-candidate-modal-form"]').waitFor({ state: "hidden", timeout: 20000 });
  const candidateRow = page.locator("tr").filter({ hasText: candidateName }).first();
  await candidateRow.waitFor({ state: "visible", timeout: 20000 });
  await candidateRow.locator('[data-testid^="hr-recruitment-candidate-view-"]').click();

  console.log("\n>>> UPLOAD CANDIDATE RESUME AUTOMATICALLY...");
  await page.locator('[data-testid="hr-recruitment-candidate-resume-file"]').waitFor({ state: "attached", timeout: 30000 });
  await pause("candidate resume upload area");
  const driveRequestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/drive/initiate-upload"), { timeout: 30000 });
  const resumeResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && /\/recruitment\/candidates\/[^/?]+\/resume/.test(response.url()), { timeout: 60000 });
  await page.locator('[data-testid="hr-recruitment-candidate-resume-file"]').setInputFiles(RESUME_FILE);
  console.log(`   [File] Resume selected: "${RESUME_FILE}"`);
  await pause("selected resume and upload progress");
  const driveRequest = await driveRequestPromise;
  const drivePayload = driveRequest.postDataJSON();
  if (drivePayload?.contextType !== "CAREERS") throw new Error(`Resume contextType must be CAREERS; received ${drivePayload?.contextType || "missing"}`);
  if (drivePayload?.featureModuleName !== "HR_CAREERS") throw new Error(`Resume featureModuleName must be HR_CAREERS; received ${drivePayload?.featureModuleName || "missing"}`);
  console.log(`   [File] Resume selected automatically: "${RESUME_FILE}"`);
  console.log('   [Verified] Drive contextType: "CAREERS", featureModuleName: "HR_CAREERS"');
  const resumeResponse = await resumeResponsePromise;
  console.log(`   [Response] Save Candidate Resume: ${resumeResponse.status()} ${resumeResponse.statusText()}`);
  if (!resumeResponse.ok()) throw new Error(`Resume save failed: ${await resumeResponse.text()}`);
  await page.locator('[data-testid="hr-recruitment-candidate-resume-download"]').waitFor({ state: "visible", timeout: 60000 });
  await pause("completed candidate resume upload");
  await action('[data-testid="hr-recruitment-candidate-resume-download"]', "Download Resume");

  await visit("/hr/recruitment", "RECRUITMENT OVERVIEW");
  await action('[data-testid="hr-recruitment-view-requisitions"]', "View Requisitions", true);

  await visit("/hr/recruitment/applications", "APPLICATION ACTIONS");
  const applicationCard = page.locator('[data-testid^="hr-recruitment-application-card-"]').filter({ hasText: publicCandidateName }).first();
  await applicationCard.waitFor({ state: "visible", timeout: 30000 });
  const applicationId = (await applicationCard.getAttribute("data-testid")).replace("hr-recruitment-application-card-", "");
  const applicationSelector = (suffix) => `[data-testid="hr-recruitment-application-${applicationId}-${suffix}"]`;
  const openApplicationActions = async (label) => {
    await action(`[data-testid="hr-recruitment-application-actions-trigger-${applicationId}"]`, label);
  };
  const scheduleStageInterview = async (label, daysFromNow) => {
    const dialog = page.locator('[data-testid="hr-recruitment-schedule-interview-dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 20000 });
    const scheduledAt = new Date(Date.now() + daysFromNow * 86400000);
    scheduledAt.setMinutes(scheduledAt.getMinutes() - scheduledAt.getTimezoneOffset());
    await fill('[data-testid="hr-recruitment-schedule-interview-at"]', scheduledAt.toISOString().slice(0, 16), `${label} Date and Time`);
    await fill('[data-testid="hr-recruitment-schedule-interview-location"]', "Automation video interview", `${label} Location / Link`);
    await action('[data-testid="hr-recruitment-schedule-interview-submit"]', `Confirm ${label}`);
    await dialog.waitFor({ state: "hidden", timeout: 30000 });
    await applicationCard.waitFor({ state: "visible", timeout: 30000 });
    await pause(`${label} result`);
  };

  console.log(`   [Application] Using current-run candidate: "${publicCandidateName}"`);
  await openApplicationActions("Open Application Actions for Notes");
  await action(applicationSelector("notes"), "Open Application Notes");
  await fill('[data-testid="hr-recruitment-application-notes-input"]', `Automation recruitment note ${suffix}`, "Application Notes");
  await action('[data-testid="hr-recruitment-application-notes-save"]', "Save Application Notes");
  await page.locator('[data-testid="hr-recruitment-application-notes-dialog"]').waitFor({ state: "hidden", timeout: 20000 });

  await openApplicationActions("Open Application Actions for Rating");
  await action(applicationSelector("rating"), "Open Application Rating");
  await fill('[data-testid="hr-recruitment-application-rating-input"]', "8", "Application Rating");
  await action('[data-testid="hr-recruitment-application-rating-save"]', "Save Application Rating");
  await page.locator('[data-testid="hr-recruitment-application-rating-dialog"]').waitFor({ state: "hidden", timeout: 20000 });

  await openApplicationActions("Open Application Actions for Screening");
  await action(applicationSelector("move-screening"), "Move Application to Screening");
  await scheduleStageInterview("Screening Interview", 1);

  await openApplicationActions("Open Application Actions for Interview");
  await action(applicationSelector("move-interview"), "Move Application to Interview");
  await scheduleStageInterview("Technical Interview", 2);

  const rejectTriggerId = await page.locator('[data-testid^="hr-recruitment-application-actions-trigger-"]').evaluateAll(
    (triggers, currentId) => triggers.map((trigger) => trigger.getAttribute("data-testid")).find((id) => id && !id.endsWith(currentId)) || "",
    applicationId,
  );
  if (rejectTriggerId) {
    const rejectApplicationId = rejectTriggerId.replace("hr-recruitment-application-actions-trigger-", "");
    await action(`[data-testid="${rejectTriggerId}"]`, "Open Another Application for Rejection");
    await action(`[data-testid="hr-recruitment-application-${rejectApplicationId}-reject"]`, "Reject Application");
    await fill('[data-testid="hr-recruitment-application-reject-reason"]', `Position requirements not matched ${suffix}`, "Rejection Reason");
    await action('[data-testid="hr-recruitment-application-reject-confirm"]', "Confirm Application Rejection");
    await page.locator('[data-testid="hr-recruitment-application-reject-dialog"]').waitFor({ state: "hidden", timeout: 20000 });
    await pause("rejected application result");
  } else {
    console.log("   [Skip] Reject Application: a second application record is not available");
  }

  await visit("/hr/recruitment/interviews", "INTERVIEW ACTIONS");
  await action('[data-testid="hr-recruitment-schedule-interview"]', "Schedule Interview", true);
  const scheduleDialog = page.locator('[data-testid="hr-recruitment-interview-dialog"]');
  if (await scheduleDialog.isVisible().catch(() => false)) {
    console.log("   [View] Schedule Interview form");
    await pause("schedule interview form");
    await page.keyboard.press("Escape");
  }
  const updateInterview = page.locator('[data-testid^="hr-recruitment-interview-update-"]').first();
  if (await updateInterview.isVisible().catch(() => false)) { await updateInterview.click(); await pause("update interview form"); await page.keyboard.press("Escape"); }
  else console.log("   [Skip] Update Interview: no interview record is available");

  await visit("/hr/recruitment/offers", "OFFER ACTIONS");
  await action('[data-testid="hr-recruitment-new-offer"]', "New Offer", true);
  await pause("new offer form");
  await page.keyboard.press("Escape");
  const viewOffer = page.locator('[data-testid^="hr-recruitment-offer-view-"]').first();
  if (await viewOffer.isVisible().catch(() => false)) { await viewOffer.click(); await pause("offer details"); await page.keyboard.press("Escape"); }
  else console.log("   [Skip] View Offer: no offer record is available");
  const convertOffer = page.locator('[data-testid^="hr-recruitment-offer-convert-"]').first();
  if (await convertOffer.isVisible().catch(() => false)) { await convertOffer.click(); await pause("convert accepted offer form"); await page.keyboard.press("Escape"); }
  else console.log("   [Skip] Convert Offer: no accepted offer is available");

  await visit("/hr/recruitment/careers", "CAREERS ACTIONS");
  const editPosting = page.locator('[data-testid^="hr-careers-edit-"]').first();
  if (await editPosting.isVisible().catch(() => false)) { await editPosting.click(); await pause("edit published role"); await page.keyboard.press("Escape"); }
  else console.log("   [Skip] Edit Published Role: no posting is available");
  const unpublish = page.locator('[data-testid^="hr-careers-unpublish-"]').first();
  if (await unpublish.isVisible().catch(() => false)) { await unpublish.click(); await pause("unpublished role"); }
  else console.log("   [Skip] Unpublish Role: no published role is available");

  console.log("=========================================================");
  console.log("  RECRUITMENT-ONLY AUTOMATION COMPLETED                 ");
  console.log("=========================================================");
  await page.waitForTimeout(headed ? 3000 : 0);
  await browser.close();
}

run().catch((error) => {
  console.error("Recruitment automation error:", error);
  process.exit(1);
});
