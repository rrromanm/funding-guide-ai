import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

async function load<T>(path: string): Promise<T> {
  vi.resetModules();
  return import(path);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("env", () => {
  it("falls back to the defaults", async () => {
    vi.stubEnv("PORT", undefined);
    vi.stubEnv("CORS_ORIGIN", undefined);
    vi.stubEnv("GEMINI_MODEL", undefined);
    vi.stubEnv("GEMINI_RPM", undefined);

    const { env } = await load<typeof import("../src/config/env.ts")>(
      "../src/config/env.ts",
    );

    expect(env).toMatchObject({
      PORT: 4000,
      CORS_ORIGIN: "http://localhost:3000",
      GEMINI_MODEL: "gemini-3.5-flash-lite",
      GEMINI_RPM: 15,
    });
  });

  it("coerces numbers", async () => {
    vi.stubEnv("PORT", "8080");

    const { env } = await load<typeof import("../src/config/env.ts")>(
      "../src/config/env.ts",
    );

    expect(env.PORT).toBe(8080);
  });

  it.each([
    ["PORT", "abc"],
    ["PORT", "-1"],
    ["SUPABASE_URL", "not a url"],
    ["DATABASE_URL", ""],
  ])("throws at startup on %s=%j", async (name, value) => {
    vi.stubEnv(name, value);

    await expect(load("../src/config/env.ts")).rejects.toThrow(
      `Invalid environment`,
    );
  });
});

describe("index.ts", () => {
  function exitThrows() {
    vi.spyOn(console, "error").mockImplementation(() => {});
    return vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
  }

  it("exits without DATABASE_URL", async () => {
    const exit = exitThrows();
    vi.stubEnv("DATABASE_URL", undefined);

    await expect(load("../src/index.ts")).rejects.toThrow("exit 1");
    expect(console.error).toHaveBeenCalledWith("DATABASE_URL is required");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits without SUPABASE_URL", async () => {
    exitThrows();
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("SUPABASE_URL", undefined);

    await expect(load("../src/index.ts")).rejects.toThrow("exit 1");
    expect(console.error).toHaveBeenCalledWith("SUPABASE_URL is required");
  });

  it("exports the app without listening on Vercel", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("VERCEL", "1");

    const { default: app } =
      await load<typeof import("../src/index.ts")>("../src/index.ts");
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});
