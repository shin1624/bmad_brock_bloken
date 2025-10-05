import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * Story 7.2: E2E Testing Implementation
 */
export default defineConfig({
  testDir: "./e2e",

  // Maximum time one test can run for
  timeout: 30 * 1000,

  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "e2e-reports" }],
    ["json", { outputFile: "e2e-reports/results.json" }],
    ["junit", { outputFile: "e2e-reports/junit.xml" }],
    ["list"],
  ],

  // Shared settings for all the projects below
  use: {
    // Maximum time each action such as `click()` can take
    actionTimeout: 10000,

    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Video recording
    video: process.env.CI ? "retain-on-failure" : "off",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Custom viewport for game testing
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Test against mobile viewports
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        // Mobile game testing
        hasTouch: true,
      },
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        hasTouch: true,
      },
    },

    // Test against branded browsers if needed
    {
      name: "Microsoft Edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run dev",
    port: 3001,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
