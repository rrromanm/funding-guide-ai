import { createHash } from "node:crypto";
import { z } from "zod";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { LlmProvider } from "../../lib/llm.ts";
import { MIN_DESCRIPTION_CHARS } from "./matches.config.ts";
import { judgeOutput, type ScoredResult } from "./matches.schema.ts";
import { aggregate, groundCheck } from "./matches.scoring.ts";
import { PROMPT_VERSION, buildPrompt } from "./prompt.v1.ts";

const PROFILE_ID = 1;
const JUDGE_SCHEMA = (() => {
  const { $schema, ...rest } = z.toJSONSchema(judgeOutput);
  return rest;
})();

export type CallInput = {
  id: number;
  title: string;
  text: string;
  missingData: string[];
};

export async function loadProfileText(): Promise<string> {
  const profile = await db
    .selectFrom("org_profile")
    .selectAll()
    .where("id", "=", PROFILE_ID)
    .executeTakeFirst();
  if (!profile) throw new NotFoundError("Profile not found");

  const tags = await db
    .selectFrom("org_profile_tag")
    .innerJoin("tag", "tag.id", "org_profile_tag.tag_id")
    .select(["tag.label", "tag.type"])
    .where("org_profile_tag.org_profile_id", "=", PROFILE_ID)
    .orderBy("tag.type")
    .orderBy("tag.label")
    .execute();
  const labels = (type: string) =>
    tags
      .filter((t) => t.type === type)
      .map((t) => t.label)
      .join(", ") || "not stated";

  return [
    `Name: ${profile.name}`,
    `Legal status: ${profile.legal_status}`,
    `Location: ${profile.city}, ${profile.country}`,
    `Other profile tags (e.g. region): ${labels("other")}`,
    `Founded: ${
      profile.founded_year
        ? `${profile.founded_year} (${new Date().getFullYear() - profile.founded_year} years old)`
        : "not stated"
    }`,
    `Paid staff: ${profile.staff_count}`,
    `Owns buildings or facilities: ${tags.some((t) => t.type === "other" && t.label === "facilities") ? "yes" : "no"}`,
    `Administrative capacity: ${profile.admin_capacity?.trim() || "not stated"}`,
    `Themes: ${labels("theme")}`,
    `Target groups: ${labels("target_group")}`,
  ].join("\n");
}

export async function loadCalls(callId?: number): Promise<CallInput[]> {
  let query = db
    .selectFrom("funding_call")
    .select([
      "id",
      "title",
      "summary",
      "description",
      "eligibility",
      "funding_body",
      "level",
      "funder_type",
      "status",
      "recurring",
      "budget_min",
      "budget_max",
      "currency",
    ])
    .where("deleted_at", "is", null)
    .orderBy("id");
  if (callId !== undefined) query = query.where("id", "=", callId);

  const [calls, rounds] = await Promise.all([
    query.execute(),
    db
      .selectFrom("funding_round")
      .select([
        "call_id",
        "round_no",
        "open_date",
        "deadline_date",
        "decision_date",
      ])
      .orderBy("call_id")
      .orderBy("round_no")
      .execute(),
  ]);

  return calls.map((call) => {
    const own = rounds.filter((r) => r.call_id === call.id);
    const budget =
      call.budget_min === null && call.budget_max === null
        ? "not stated"
        : `${call.budget_min ?? "?"}-${call.budget_max ?? "?"} ${call.currency}`;
    const roundLines = own.map(
      (r) =>
        `- round ${r.round_no ?? "?"}: opens ${r.open_date ?? "?"}, deadline ${r.deadline_date ?? "?"}, decision ${r.decision_date ?? "?"}`,
    );

    const missingData = [];
    if ((call.description ?? "").trim().length < MIN_DESCRIPTION_CHARS)
      missingData.push("description");
    if (!call.recurring && !own.some((r) => r.deadline_date))
      missingData.push("deadline");
    if (budget === "not stated") missingData.push("budget");

    const text = [
      `Title: ${call.title}`,
      `Funding body: ${call.funding_body || "not stated"}`,
      `Level: ${call.level ?? "not stated"}; funder type: ${call.funder_type ?? "not stated"}`,
      `Status: ${call.status}; recurring: ${call.recurring ? "yes" : "no"}`,
      `Budget: ${budget}`,
      `Rounds:\n${roundLines.join("\n") || "none listed"}`,
      call.summary ? `Summary: ${call.summary}` : "",
      call.eligibility ? `Eligibility: ${call.eligibility}` : "",
      `Description:\n${call.description?.trim() || "none"}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { id: call.id, title: call.title, text, missingData };
  });
}

export function inputHash(callText: string, model: string) {
  return createHash("sha256")
    .update([callText, PROMPT_VERSION, model].join("\u0000"))
    .digest("hex");
}

export async function findCallsToScore(model: string, callId?: number) {
  const [calls, stored] = await Promise.all([
    loadCalls(callId),
    db.selectFrom("match_result").select(["call_id", "input_hash"]).execute(),
  ]);
  if (callId !== undefined) return calls;

  const hashes = new Map(stored.map((row) => [row.call_id, row.input_hash]));
  return calls.filter(
    (call) => hashes.get(call.id) !== inputHash(call.text, model),
  );
}

export async function judgeCall(
  call: CallInput,
  profileText: string,
  provider: LlmProvider,
  today = new Date().toISOString().slice(0, 10),
) {
  const raw = await provider.generateJson(
    buildPrompt(call.text, profileText, today),
    JUDGE_SCHEMA,
  );
  const output = judgeOutput.parse(raw);
  return {
    raw,
    result: aggregate(groundCheck(output, call.text), call.missingData),
  };
}

export async function scoreCall(callId: number, provider: LlmProvider) {
  const [profileText, [call]] = await Promise.all([
    loadProfileText(),
    loadCalls(callId),
  ]);
  if (!call) throw new NotFoundError("Call not found");

  const { raw, result } = await judgeCall(call, profileText, provider);
  await saveResult(call, provider.model, raw, result);
}

export async function saveResult(
  call: CallInput,
  model: string,
  raw: unknown,
  result: ScoredResult,
) {
  const row = {
    org_profile_id: PROFILE_ID,
    score: result.score,
    fit_label: result.fitLabel,
    confidence: result.confidence,
    blocking_reason: result.blockingReason,
    raw_response: JSON.stringify(raw),
    model,
    prompt_version: PROMPT_VERSION,
    input_hash: inputHash(call.text, model),
    scored_at: new Date(),
  };

  await db.transaction().execute(async (trx) => {
    const { id } = await trx
      .insertInto("match_result")
      .values({ call_id: call.id, ...row })
      .onConflict((oc) => oc.column("call_id").doUpdateSet(row))
      .returning("id")
      .executeTakeFirstOrThrow();
    await trx.deleteFrom("match_reason").where("match_id", "=", id).execute();
    if (result.keyPoints.length === 0) return;
    await trx
      .insertInto("match_reason")
      .values(
        result.keyPoints.map((p) => ({
          match_id: id,
          kind: p.kind,
          label: p.about,
          message: p.text,
        })),
      )
      .execute();
  });
}
