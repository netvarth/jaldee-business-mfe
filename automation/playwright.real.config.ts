import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL,
    screenshot: "on",
    video: "on",
    launchOptions: {
      slowMo: 250,
    },
    testIdAttribute: "data-testid",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm.cmd --prefix ../apps/shell-host run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
