import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 10 * 60_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "../reports/leads", open: "never" }],
    ["json", { outputFile: "../reports/leads-results.json" }],
  ],
  use: {
    baseURL,
    headless: process.env.LEADS_HEADLESS === "1",
    launchOptions: {
      slowMo: 250,
      args: ["--start-maximized"],
    },
    viewport: null,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },
  webServer: {
    command: `npm --workspace shell-host run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: null },
    },
  ],
});
