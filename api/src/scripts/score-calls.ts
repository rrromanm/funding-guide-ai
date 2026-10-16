//   npm run score:llm
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { env } from "../config/env.ts";
import { db } from "../lib/db.ts";
import { DailyQuotaError, geminiProvider } from "../lib/llm.ts";
import {
  findCallsToScore,
  judgeCall,
  loadProfileText,
  saveResult,
} from "../modules/matches/matches.service.ts";

const { values } = parseArgs({
  options: { call: { type: "string" }, limit: { type: "string" } },
});

if (!env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set (see api/.env.example)");
  process.exit(1);
}

const provider = geminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
const profileText = await loadProfileText();
const callId = values.call === undefined ? undefined : Number(values.call);
const calls = (
  await findCallsToScore(profileText, provider.model, callId)
).slice(0, values.limit === undefined ? undefined : Number(values.limit));

const intervalMs = Math.ceil(60_000 / env.GEMINI_RPM);

console.log(
  `${calls.length} call(s) to score with ${provider.model}, one every ${intervalMs / 1000}s`,
);
let scored = 0;
let failed = 0;

for (const [i, call] of calls.entries()) {
  if (i > 0) await delay(intervalMs);
  try {
    const { raw, result } = await judgeCall(call, profileText, provider);
    await saveResult(call, profileText, provider.model, raw, result);
    scored++;
    console.log(
      `#${call.id} ${call.title}: ${result.score} ${result.fitLabel} (${result.confidence})` +
        (result.blockingReason ? ` blocked: ${result.blockingReason}` : ""),
    );
  } catch (err) {
    if (err instanceof DailyQuotaError) {
      console.error(
        `daily quota spent: stopping, ${calls.length - i} call(s) left for the next run`,
      );
      break;
    }
    failed++;
    console.error(
      `#${call.id} ${call.title}: failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}

console.log(
  `done: ${scored} scored, ${failed} failed, ${calls.length - scored - failed} left`,
);
await db.destroy();
process.exitCode = failed > 0 ? 1 : 0;
