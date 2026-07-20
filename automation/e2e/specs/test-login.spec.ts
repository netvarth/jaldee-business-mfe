import { test, expect } from "@playwright/test";

test("test login and navigate to /hr for dhyandarshAyurvedic", async ({ page }) => {
  test.setTimeout(60000);
  page.on("console", msg => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to /login...");
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "domcontentloaded" });

  const loginInput = page.getByRole("textbox", { name: "Login ID" });
  await expect(loginInput).toBeVisible({ timeout: 10000 });
  await loginInput.fill("dhyanIT");

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill("dhyanIT@1");

  console.log("Submitting login form...");
  await page.getByRole("button", { name: /^Sign in$/i }).click();

  await page.waitForURL(url => !url.href.includes("/login"), { timeout: 15000 });
  console.log("Logged in! Current URL:", page.url());

  console.log("Navigating to /hr...");
  await page.goto("http://127.0.0.1:3000/hr", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  console.log("After /hr URL:", page.url());

  const testIdCount = await page.locator("[data-testid]").count();
  console.log("Total testId elements on /hr:", testIdCount);
  
  const testIds = await page.locator("[data-testid]").evaluateAll(els => els.map(e => e.getAttribute("data-testid")));
  console.log("Found testIds on /hr:", JSON.stringify(testIds.slice(0, 30)));
});
