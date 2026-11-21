import { describe, expect, it, vi } from "vitest";
import {
  DailyQuotaError,
  geminiProvider,
  LlmHttpError,
  withRetry,
} from "../src/lib/llm.ts";

describe("withRetry", () => {
  it("returns the first success without sleeping", async () => {
    const sleep = vi.fn(async () => {});

    expect(await withRetry(async () => "ok", { sleep })).toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("backs off exponentially on 429 and 5xx, then succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LlmHttpError(429, "slow down"))
      .mockRejectedValueOnce(new LlmHttpError(503, "busy"))
      .mockRejectedValueOnce(new LlmHttpError(500, "oops"))
      .mockResolvedValue("ok");

    expect(await withRetry(fn, { baseMs: 100, sleep })).toBe("ok");
    expect(sleep.mock.calls).toEqual([[100], [200], [400]]);
  });

  it("waits as long as the server asks", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LlmHttpError(429, "slow down", 7000))
      .mockResolvedValue("ok");

    await withRetry(fn, { sleep });
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it("gives up after the last attempt", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValue(new LlmHttpError(503, "busy"));

    await expect(withRetry(fn, { attempts: 3, sleep })).rejects.toThrow("busy");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["a 400", new LlmHttpError(400, "bad request")],
    ["a daily quota error", new DailyQuotaError("PerDay")],
    ["a plain error", new Error("bad JSON")],
  ])("never retries %s", async (_case, error) => {
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { sleep: async () => {} })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("geminiProvider", () => {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  const answer = (...parts: string[]) =>
    reply({
      candidates: [{ content: { parts: parts.map((text) => ({ text })) } }],
    });

  it("sends the prompt and schema to the model, and parses its JSON", async () => {
    const fetchFn = vi.fn(async () => answer('{"score":', " 80}"));
    const provider = geminiProvider("secret", "gemini-test", fetchFn);

    const result = await provider.generateJson("Rate this", { type: "object" });

    expect(result).toEqual({ score: 80 });
    expect(provider.model).toBe("gemini-test");

    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/models\/gemini-test:generateContent$/);
    expect(init.headers).toMatchObject({ "x-goog-api-key": "secret" });
    expect(JSON.parse(init.body as string)).toEqual({
      contents: [{ role: "user", parts: [{ text: "Rate this" }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseJsonSchema: { type: "object" },
      },
    });
  });

  it("stops at once when the daily quota is spent", async () => {
    const fetchFn = vi.fn(async () =>
      reply(
        {
          error: {
            message: "Quota exceeded",
            details: [{ violations: [{ quotaId: "RequestsPerDay" }] }],
          },
        },
        429,
      ),
    );

    await expect(
      geminiProvider("key", "m", fetchFn).generateJson("p", {}),
    ).rejects.toBeInstanceOf(DailyQuotaError);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it(
    "retries a per-minute 429 after the delay Gemini asks for",
    { timeout: 1000 },
    async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(
          reply(
            {
              error: {
                message: "Slow down",
                details: [{ retryDelay: "0.01s" }],
              },
            },
            429,
          ),
        )
        .mockResolvedValue(answer("{}"));

      expect(
        await geminiProvider("key", "m", fetchFn).generateJson("p", {}),
      ).toEqual({});
      expect(fetchFn).toHaveBeenCalledTimes(2);
    },
  );

  it("throws an LlmHttpError with Gemini's message on a 4xx", async () => {
    const fetchFn = vi.fn(async () =>
      reply({ error: { message: "API key not valid" } }, 400),
    );

    const error = await geminiProvider("key", "m", fetchFn)
      .generateJson("p", {})
      .catch((err) => err);

    expect(error).toBeInstanceOf(LlmHttpError);
    expect(error).toMatchObject({
      status: 400,
      message: "Gemini 400: API key not valid",
    });
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response("<html>", { status: 403, statusText: "Forbidden" }),
    );

    await expect(
      geminiProvider("key", "m", fetchFn).generateJson("p", {}),
    ).rejects.toThrow("Gemini 403: Forbidden");
  });

  it("throws when the model returns no text", async () => {
    const fetchFn = vi.fn(async () =>
      reply({ candidates: [{ finishReason: "SAFETY" }] }),
    );

    await expect(
      geminiProvider("key", "m", fetchFn).generateJson("p", {}),
    ).rejects.toThrow("Gemini returned no text (SAFETY)");
  });
});
