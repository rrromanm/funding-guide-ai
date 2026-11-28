import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storageState = process.env.E2E_STORAGE_STATE;
const hasLogin = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const needsLoginSetup = hasLogin && !storageState;
const authFile = "e2e/.auth/admin.json";
const mutationTestsEnabled = process.env.E2E_MUTATION_TESTS === "1";
const mutationApiUrl = "http://127.0.0.1:4001";
// Unset uses Playwright's bundled Chromium; set to "chrome" to use an installed Google Chrome.
const browser = { ...devices["Desktop Chrome"], channel: process.env.E2E_BROWSER_CHANNEL || undefined };

function requireIsolatedMutationEnvironment() {
  if (!storageState && !hasLogin) {
    throw new Error(
      "Mutation E2E requires E2E_STORAGE_STATE or E2E_EMAIL and E2E_PASSWORD for an admin session against the isolated test project.",
    );
  }

  const databaseUrl = process.env.E2E_TEST_DATABASE_URL;
  const supabaseUrl = process.env.E2E_TEST_SUPABASE_URL;
  if (!databaseUrl || !supabaseUrl || !process.env.E2E_TEST_PROJECT_ID || !process.env.E2E_ISOLATION_MARKER) {
    throw new Error(
      "Mutation E2E requires the dedicated database, Supabase URL, project ID, and database isolation marker.",
    );
  }

  const database = new URL(databaseUrl);
  const databaseName = decodeURIComponent(database.pathname.replace(/^\/+/, ""));
  if (
    !["localhost", "127.0.0.1", "::1"].includes(database.hostname) ||
    database.port !== "55422" ||
    databaseName !== "postgres"
  ) {
    throw new Error(
      "Mutation E2E requires a dedicated local Supabase database on port 55422 (database name postgres).",
    );
  }

  const supabase = new URL(supabaseUrl);
  if (
    !["localhost", "127.0.0.1", "::1"].includes(supabase.hostname) ||
    supabase.port !== "55421"
  ) {
    throw new Error(
      "Mutation E2E requires its dedicated local Supabase API on port 55421; refusing to run against a hosted or default local project.",
    );
  }

  const app = new URL(baseURL);
  if (!["localhost", "127.0.0.1", "::1"].includes(app.hostname)) {
    throw new Error("Mutation E2E may only target a local web application.");
  }

  if (
    process.env.E2E_API_URL &&
    process.env.E2E_API_URL !== mutationApiUrl
  ) {
    throw new Error(
      `Mutation E2E only supports the isolated API at ${mutationApiUrl}.`,
    );
  }

  process.env.E2E_API_URL = mutationApiUrl;
  process.env.NEXT_PUBLIC_API_URL = mutationApiUrl;
  return { databaseUrl, supabaseUrl, appOrigin: app.origin };
}

const mutationEnvironment = mutationTestsEnabled
  ? requireIsolatedMutationEnvironment()
  : undefined;

// "public" needs no credentials. "admin" only exists when a login or saved session is provided.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: mutationTestsEnabled ? 1 : undefined,
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
  webServer: [
    ...(mutationEnvironment
      ? [
          {
            command: "npm run start",
            cwd: "../api",
            url: `${mutationApiUrl}/health`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
              PORT: "4001",
              DATABASE_URL: mutationEnvironment.databaseUrl,
              SUPABASE_URL: mutationEnvironment.supabaseUrl,
              CORS_ORIGIN: mutationEnvironment.appOrigin,
            },
          },
        ]
      : []),
    ...(process.env.E2E_START_SERVER || mutationEnvironment
      ? [
          {
            command: mutationEnvironment
              ? "npm run dev -- --hostname 127.0.0.1"
              : "npm run start",
            url: baseURL,
            reuseExistingServer: mutationEnvironment
              ? false
              : !process.env.CI,
            timeout: 120_000,
            env: {
              ...(mutationEnvironment
                ? {
                    NEXT_PUBLIC_API_URL: mutationApiUrl,
                    NEXT_PUBLIC_SUPABASE_URL: mutationEnvironment.supabaseUrl,
                  }
                : {}),
            },
          },
        ]
      : []),
  ],
});
