import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storageState = process.env.E2E_STORAGE_STATE;
const hasLogin = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const needsLoginSetup = hasLogin && !storageState;
const authFile = "e2e/.auth/admin.json";
// Unset uses Playwright's bundled Chromium; set to "chrome" to use an installed Google Chrome.
const browser = { ...devices["Desktop Chrome"], channel: process.env.E2E_BROWSER_CHANNEL || undefined };

// "public" needs no credentials. "admin" only exists when a login or saved session is provided.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "public", testMatch: /.*\.public\.spec\.ts/, use: browser },
    ...(needsLoginSetup ? [{ name: "setup", testMatch: /auth\.setup\.ts/, use: browser }] : []),
    ...(storageState || hasLogin
      ? [
          {
            name: "admin",
            testMatch: /.*\.admin\.spec\.ts/,
            dependencies: needsLoginSetup ? ["setup"] : [],
            use: { ...browser, storageState: storageState ?? authFile },
          },
        ]
      : []),
  ],
  webServer: process.env.E2E_START_SERVER
    ? { command: "npm run start", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 }
    : undefined,
});
