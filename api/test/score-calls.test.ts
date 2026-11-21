import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { db } from "../src/lib/db.ts";
import { describeDb, insertCall, modelOutput, saveScore } from "./helpers.ts";

const generateJson = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/llm.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/llm.ts")>()),
  geminiProvider: (_key: string, model: string) => ({ model, generateJson }),
}));

const argv = process.argv;
afterEach(() => {
  process.argv = argv;
  process.exitCode = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  generateJson.mockReset();
});

async function run(args: string[] = [], geminiKey = "test-key") {
  process.argv = [argv[0], "score-calls.ts", ...args];
  vi.stubEnv("GEMINI_API_KEY", geminiKey);
  vi.stubEnv("GEMINI_RPM", "60000");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.resetModules();
  await import("../src/scripts/score-calls.ts");
}

async function notificationsDuring(fn: () => Promise<void>) {
  const { last } = await db
    .selectFrom("notification")
    .select((eb) => eb.fn.max("id").as("last"))
    .executeTakeFirstOrThrow();
  onTestFinished(async () => {
    await db
      .deleteFrom("notification")
      .where("id", ">", last ?? 0)
      .where("message", "=", "Found 1 new call, 1 relevant.")
      .execute();
  });
  await fn();
  const rows = await db
    .selectFrom("notification")
    .select("message")
    .where("id", ">", last ?? 0)
    .where("message", "like", "Found 1 new call, _ relevant.")
    .execute();
  return rows.map((row) => row.message);
}

function storedScore(callId: number) {
  return db
    .selectFrom("match_result")
    .select("score")
    .where("call_id", "=", callId)
    .executeTakeFirst();
}

describe("npm run score:llm", () => {
  it("exits when GEMINI_API_KEY is not set", async () => {
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });

    await expect(run([], "")).rejects.toThrow("exit 1");
    expect(console.error).toHaveBeenCalledWith(
      "GEMINI_API_KEY is not set (see api/.env.example)",
    );
  });
});

describeDb("npm run score:llm (database)", () => {
  it("scores the call, and notifies about it as new and relevant", async () => {
    const id = await insertCall();
    generateJson.mockResolvedValue(modelOutput(3));

    const messages = await notificationsDuring(() =>
      run(["--call", String(id)]),
    );

    expect(await storedScore(id)).toEqual({ score: 75 });
    expect(messages).toEqual(["Found 1 new call, 1 relevant."]);
    expect(console.log).toHaveBeenCalledWith(
      `#${id} Test call: 75 strong_fit (low)`,
    );
    expect(process.exitCode).toBe(0);
  });

  it("does not notify about a re-score", async () => {
    const id = await insertCall();
    await saveScore(id, 40);
    generateJson.mockResolvedValue(modelOutput(3));

    const messages = await notificationsDuring(() =>
      run(["--call", String(id)]),
    );

    expect(await storedScore(id)).toEqual({ score: 75 });
    expect(messages).toEqual([]);
  });

  it("scores no more than --limit calls", async () => {
    const id = await insertCall();

    await run(["--call", String(id), "--limit", "0"]);

    expect(generateJson).not.toHaveBeenCalled();
    expect(await storedScore(id)).toBeUndefined();
  });

  it("stops when the daily quota is spent, leaving the call for the next run", async () => {
    const id = await insertCall();
    generateJson.mockImplementation(async () => {
      const { DailyQuotaError } = await import("../src/lib/llm.ts");
      throw new DailyQuotaError("Gemini 429: PerDay");
    });

    await run(["--call", String(id)]);

    expect(console.error).toHaveBeenCalledWith(
      "daily quota spent: stopping, 1 call(s) left for the next run",
    );
    expect(await storedScore(id)).toBeUndefined();
    expect(process.exitCode).toBe(0);
  });

  it("exits with 1 when a call fails", async () => {
    const id = await insertCall();
    generateJson.mockRejectedValue(new Error("Gemini 500: oops"));

    await run(["--call", String(id)]);

    expect(console.error).toHaveBeenCalledWith(
      `#${id} Test call: failed:`,
      "Gemini 500: oops",
    );
    expect(process.exitCode).toBe(1);
  });
});
