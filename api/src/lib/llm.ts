import { setTimeout as delay } from "node:timers/promises";

export type LlmProvider = {
  model: string;
  generateJson(prompt: string, jsonSchema: object): Promise<unknown>;
};

export class LlmHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export class DailyQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 5,
    baseMs = 2000,
    sleep = delay as (ms: number) => Promise<unknown>,
  } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable =
        err instanceof LlmHttpError && RETRYABLE.has(err.status);
      if (!retryable || attempt >= attempts) throw err;
      await sleep(err.retryAfterMs ?? baseMs * 2 ** (attempt - 1));
    }
  }
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiProvider(
  apiKey: string,
  model: string,
  fetchFn: typeof fetch = fetch,
): LlmProvider {
  return {
    model,
    generateJson: (prompt, jsonSchema) =>
      withRetry(async () => {
        const res = await fetchFn(`${GEMINI_URL}/${model}:generateContent`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema,
            },
          }),
          signal: AbortSignal.timeout(120_000),
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message = `Gemini ${res.status}: ${body?.error?.message ?? res.statusText}`;
          if (
            res.status === 429 &&
            JSON.stringify(body?.error?.details ?? []).includes("PerDay")
          ) {
            throw new DailyQuotaError(message);
          }
          throw new LlmHttpError(res.status, message, retryDelayMs(body));
        }

        const text = body?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? "")
          .join("");
        if (!text) {
          const reason = body?.candidates?.[0]?.finishReason ?? "no candidate";
          throw new Error(`Gemini returned no text (${reason})`);
        }
        return JSON.parse(text);
      }),
  };
}

function retryDelayMs(body: any): number | undefined {
  const info = body?.error?.details?.find(
    (detail: { retryDelay?: string }) => detail.retryDelay,
  );
  const seconds = Number.parseFloat(info?.retryDelay ?? "");
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : undefined;
}
