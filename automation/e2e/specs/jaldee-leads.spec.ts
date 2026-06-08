import { expect, test } from "@playwright/test";
import { mockShellAndLeadApis, seedAuthenticatedShell, testLead } from "../fixtures/jaldee-leads";

test.describe("jaldee leads", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", msg => console.log("LEADS CONSOLE:", msg.text()));
    page.on("pageerror", err => console.log("LEADS ERROR:", err.message));
    await seedAuthenticatedShell(page);
    await mockShellAndLeadApis(page);
  });

  test("opens dashboard and navigates new lead card to create lead page", async ({ page }) => {
    await page.goto("/jaldee-leads/dashboard");

    await expect(page.getByTestId("jaldee-leads-dashboard-page")).toBeVisible();
    await page.getByTestId("jaldee-leads-dashboard-new-lead-button").click();

    await expect(page).toHaveURL(/\/jaldee-leads\/leads\/create$/);
    await expect(page.getByTestId("jaldee-leads-create-lead-page")).toBeVisible();
  });

  test("creates a lead with pipeline-derived product and channel", async ({ page }) => {
    await page.goto("/jaldee-leads/leads/create");

    await page.getByTestId("jaldee-leads-create-lead-first-name-input").fill("Meera");
    await page.getByTestId("jaldee-leads-create-lead-last-name-input").fill("Menon");
    await page.getByTestId("jaldee-leads-create-lead-email-input").fill("meera.e2e@example.com");
    await page.getByTestId("jaldee-leads-create-lead-company-input").fill("E2E Care");
    await page.getByTestId("jaldee-leads-create-lead-product-select").selectOption("product-e2e-membership");
    await page.getByTestId("jaldee-leads-create-lead-channel-select").selectOption("channel-e2e-web");
    await page.getByTestId("jaldee-leads-create-lead-save-button").click();

    await expect(page).toHaveURL(/\/jaldee-leads\/leads/);
  });

  test("opens a lead detail page and exposes compliance task automation selectors", async ({ page }) => {
    await page.goto(`/jaldee-leads/leads/${testLead.uid}`);

    await expect(page.getByTestId(`jaldee-leads-lead-${testLead.uid}-detail-page`)).toBeVisible();
    await expect(page.getByTestId(`jaldee-leads-lead-${testLead.uid}-required-task-task-e2e-call-row`)).toBeVisible();
    await expect(page.getByTestId(`jaldee-leads-lead-${testLead.uid}-required-task-task-e2e-call-row`)).toHaveAttribute("data-active", "false");
  });
});
