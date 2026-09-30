import { defineConfig } from "vitest/config";

// Tests that touch the database need DATABASE_URL; this config runs in the main
// process, so the test workers inherit whatever .env sets.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env (CI) — DB tests skip themselves
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
