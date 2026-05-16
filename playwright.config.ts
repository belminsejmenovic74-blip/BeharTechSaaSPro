import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BEHAR_BASE_URL ?? "http://127.0.0.1:3000";
const slowMo = Number(process.env.PLAYWRIGHT_SLOWMO ?? process.env.BEHAR_TEST_SLOWMO ?? "120");
const headless = (process.env.PLAYWRIGHT_HEADLESS ?? "false").toLowerCase() === "true";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    acceptDownloads: true,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    headless,
    launchOptions: {
      slowMo,
      args: ["--start-maximized"],
    },
    viewport: null,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "google-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
