import { sql, type ExpressionBuilder } from "kysely";
import { env } from "../../config/env.ts";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { DB, TagType } from "../../lib/db-types.ts";
import { geminiProvider } from "../../lib/llm.ts";
import { CONFIDENCES, KEY_POINT_KINDS } from "../matches/matches.schema.ts";
import { labelFor } from "../matches/matches.scoring.ts";
import { scoreCall } from "../matches/matches.service.ts";
import {
  CALL_LEVELS,
  CALL_STATUSES,
  FUNDER_TYPES,
  type CallDetail,
  type CallListItem,
  type CallListResponse,
  type CreateCallBody,
  type ListCallsQuery,
  type UpdateCallBody,
} from "./calls.schema.ts";

const LIST_COLUMNS = [
  "funding_call.id",
  "funding_call.title",
  "funding_call.summary",
  "funding_call.funding_body",
  "funding_source.name as source",
  "funding_call.level",
  "funding_call.status",
  "funding_call.recurring",
  "funding_call.budget_min",
  "funding_call.budget_max",
  "funding_call.currency",
  "funding_call.updated_at",
] as const;

const DETAIL_COLUMNS = [
  ...LIST_COLUMNS,
  "funding_call.description",
  "funding_call.eligibility",
  "funding_call.ngo_eligible",
  "funding_call.funder_type",
  "funding_call.source_url",
  "funding_call.external_id",
  "funding_source.last_checked",
  "funding_call.created_at",
] as const;

type Queried = "funding_call" | "funding_source";

function nextDeadline(eb: ExpressionBuilder<DB, Queried>) {
  return eb
    .selectFrom("funding_round")
    .select(({ fn }) => fn.min("funding_round.deadline_date").as("deadline"))
    .whereRef("funding_round.call_id", "=", "funding_call.id")
    .where("funding_round.deadline_date", ">=", sql<string>`current_date`)
    .as("deadline");
}

function matchScore(eb: ExpressionBuilder<DB, Queried>) {
  return eb
    .selectFrom("match_result")
    .select(
      sql<
        number | null
      >`coalesce(match_result.manual_score, match_result.score)`.as("score"),
    )
    .whereRef("match_result.call_id", "=", "funding_call.id")
    .as("score");
}

function filters(
  eb: ExpressionBuilder<DB, Queried>,
  { q, status, level }: ListCallsQuery,
) {
  const conditions = [
    eb("funding_call.deleted_at", "is", null),
    status
      ? eb("funding_call.status", "=", status)
      : eb("funding_call.status", "!=", "closed"),
    eb.not(
      eb.exists(
        eb
          .selectFrom("match_result")
          .select("match_result.id")
          .whereRef("match_result.call_id", "=", "funding_call.id")
          .where(
            sql<boolean>`coalesce(match_result.manual_score, match_result.score) = 0`,
          ),
      ),
    ),
  ];

  if (level) conditions.push(eb("funding_call.level", "=", level));

  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      eb.or([
        eb("funding_call.title", "ilike", pattern),
        eb("funding_call.summary", "ilike", pattern),
        eb("funding_call.funding_body", "ilike", pattern),
        eb("funding_call.description", "ilike", pattern),
      ]),
    );
  }

  return eb.and(conditions);
}

export async function findCalls(
  query: ListCallsQuery,
): Promise<CallListResponse> {
  const [rows, count] = await Promise.all([
    db
      .selectFrom("funding_call")
      .innerJoin(
        "funding_source",
        "funding_source.id",
        "funding_call.funding_source_id",
      )
      .select((eb) => [...LIST_COLUMNS, nextDeadline(eb), matchScore(eb)])
      .where((eb) => filters(eb, query))
      .orderBy(sql`score desc nulls last`)
      .orderBy(sql`deadline asc nulls last`)
      .orderBy("funding_call.id")
      .limit(query.limit)
      .offset(query.offset)
      .execute(),
    db
      .selectFrom("funding_call")
      .innerJoin(
        "funding_source",
        "funding_source.id",
        "funding_call.funding_source_id",
      )
      .select((eb) => eb.fn.countAll<number>().as("total"))
      .where((eb) => filters(eb, query))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    items: rows.map(toListItem),
    total: count.total,
    limit: query.limit,
    offset: query.offset,
  };
}

export async function findCallById(id: number): Promise<CallDetail> {
  const row = await db
    .selectFrom("funding_call")
    .innerJoin(
      "funding_source",
      "funding_source.id",
      "funding_call.funding_source_id",
    )
    .select((eb) => [...DETAIL_COLUMNS, nextDeadline(eb), matchScore(eb)])
    .where("funding_call.id", "=", id)
    .where("funding_call.deleted_at", "is", null)
    .executeTakeFirst();

  if (!row) throw new NotFoundError("Call not found");

  const [tags, rounds, match, reasons] = await Promise.all([
    db
      .selectFrom("funding_call_tag")
      .innerJoin("tag", "tag.id", "funding_call_tag.tag_id")
      .select(["tag.label", "tag.type"])
      .where("funding_call_tag.call_id", "=", id)
      .orderBy("tag.label")
      .execute(),
    db
      .selectFrom("funding_round")
      .select([
        "round_no",
        "open_date",
        "deadline_date",
        "decision_date",
        "expected_next_open_date",
      ])
      .where("call_id", "=", id)
      .orderBy("round_no")
      .orderBy("deadline_date")
      .execute(),
    db
      .selectFrom("match_result")
      .select(["confidence", "blocking_reason"])
      .where("call_id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("match_reason")
      .innerJoin("match_result", "match_result.id", "match_reason.match_id")
      .select([
        "match_reason.kind",
        "match_reason.label",
        "match_reason.message",
      ])
      .where("match_result.call_id", "=", id)
      .orderBy("match_reason.id")
      .execute(),
  ]);

  return {
    ...toListItem(row),
    description: text(row.description),
    eligibility: text(row.eligibility),
    ngoEligible: row.ngo_eligible,
    funderType: oneOf(FUNDER_TYPES, row.funder_type),
    themes: tags.filter((t) => t.type === "theme").map((t) => t.label),
    targetGroups: tags
      .filter((t) => t.type === "target_group")
      .map((t) => t.label),
    sourceUrl: row.source_url,
    externalId: row.external_id,
    lastChecked: row.last_checked?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    rounds: rounds.map((round) => ({
      roundNo: round.round_no,
      openDate: round.open_date,
      deadlineDate: round.deadline_date,
      decisionDate: round.decision_date,
      expectedNextOpenDate: round.expected_next_open_date,
    })),
    confidence: oneOf(CONFIDENCES, match?.confidence ?? null),
    blockingReason: match?.blocking_reason ?? null,
    reasons: reasons.map((reason) => ({
      kind: reason.kind as (typeof KEY_POINT_KINDS)[number], // match_reason_kind_check
      about: reason.label,
      message: reason.message,
    })),
  };
}

export async function createCall(body: CreateCallBody): Promise<CallDetail> {
  const { rounds = [], themes, targetGroups, ...fields } = body;

  const id = await db.transaction().execute(async (trx) => {
    const source = await trx
      .selectFrom("funding_source")
      .select("id")
      .where("source_type", "=", "manual")
      .executeTakeFirstOrThrow();
    const { id } = await trx
      .insertInto("funding_call")
      .values({
        funding_source_id: source.id,
        title: fields.title,
        summary: fields.summary,
        description: fields.description,
        eligibility: fields.eligibility,
        funding_body: fields.fundingBody,
        source_url: fields.sourceUrl,
        level: fields.level,
        funder_type: fields.funderType,
        status: fields.status ?? statusFrom(rounds),
        recurring: fields.recurring,
        ngo_eligible: fields.ngoEligible,
        budget_min: fields.budgetMin,
        budget_max: fields.budgetMax,
        currency: fields.currency,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await insertRounds(trx, id, rounds);
    await insertTags(trx, id, tagsOf(themes, targetGroups));

    return id;
  });

  if (env.GEMINI_API_KEY)
    await scoreCall(
      id,
      geminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL),
    ).catch((err) => console.error(`#${id}: scoring failed:`, err));

  return findCallById(id);
}

export async function updateCall(
  id: number,
  body: UpdateCallBody,
): Promise<CallDetail> {
  const { rounds, themes, targetGroups, ...fields } = body;

  await db.transaction().execute(async (trx) => {
    const row = await trx
      .updateTable("funding_call")
      .set({
        title: fields.title,
        summary: fields.summary,
        description: fields.description,
        eligibility: fields.eligibility,
        funding_body: fields.fundingBody,
        source_url: fields.sourceUrl,
        level: fields.level,
        funder_type: fields.funderType,
        status: fields.status ?? (rounds && statusFrom(rounds)),
        recurring: fields.recurring,
        ngo_eligible: fields.ngoEligible,
        budget_min: fields.budgetMin,
        budget_max: fields.budgetMax,
        currency: fields.currency,
        edited_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .returning("id")
      .executeTakeFirst();

    if (!row) throw new NotFoundError("Call not found");

    if (rounds) {
      await trx.deleteFrom("funding_round").where("call_id", "=", id).execute();
      await insertRounds(trx, id, rounds);
    }

    const replaced: TagType[] = [
      ...(themes ? ["theme" as const] : []),
      ...(targetGroups ? ["target_group" as const] : []),
    ];
    if (replaced.length) {
      await trx
        .deleteFrom("funding_call_tag")
        .where("call_id", "=", id)
        .where("tag_id", "in", (eb) =>
          eb.selectFrom("tag").select("id").where("type", "in", replaced),
        )
        .execute();
      await insertTags(trx, id, tagsOf(themes, targetGroups));
    }
  });

  return findCallById(id);
}

type Rounds = NonNullable<CreateCallBody["rounds"]>;
type Tags = { label: string; type: TagType }[];

async function insertRounds(trx: typeof db, callId: number, rounds: Rounds) {
  if (!rounds.length) return;
  await trx
    .insertInto("funding_round")
    .values(
      rounds.map((round, index) => ({
        call_id: callId,
        round_no: index + 1,
        open_date: round.openDate ?? null,
        deadline_date: round.deadlineDate ?? null,
        decision_date: round.decisionDate ?? null,
        expected_next_open_date: round.expectedNextOpenDate ?? null,
      })),
    )
    .execute();
}

function tagsOf(themes: string[] = [], targetGroups: string[] = []): Tags {
  return [
    ...themes.map((label) => ({ label, type: "theme" as const })),
    ...targetGroups.map((label) => ({ label, type: "target_group" as const })),
  ];
}

async function insertTags(trx: typeof db, callId: number, tags: Tags) {
  if (!tags.length) return;
  await trx
    .insertInto("tag")
    .values(tags)
    .onConflict((oc) => oc.columns(["label", "type"]).doNothing())
    .execute();
  await trx
    .insertInto("funding_call_tag")
    .columns(["call_id", "tag_id"])
    .expression(
      trx
        .selectFrom("tag")
        .select([sql.lit(callId).as("call_id"), "id"])
        .where((eb) => eb.or(tags.map((tag) => eb.and(tag)))),
    )
    .execute();
}

function statusFrom(rounds: Rounds) {
  const today = new Date().toISOString().slice(0, 10);
  const deadlines = rounds.flatMap((round) => round.deadlineDate ?? []);
  if (!deadlines.length) return undefined;
  return deadlines.some((deadline) => deadline >= today) ? "open" : "closed";
}

export async function deleteCall(id: number): Promise<void> {
  const row = await db
    .updateTable("funding_call")
    .set({ deleted_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returning("id")
    .executeTakeFirst();

  if (!row) throw new NotFoundError("Call not found");
}

type ListRow = {
  id: number;
  title: string;
  summary: string | null;
  funding_body: string | null;
  source: string;
  level: string | null;
  status: string;
  recurring: boolean;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  updated_at: Date;
  deadline: string | null;
  score: number | null;
};

function toListItem(row: ListRow): CallListItem {
  return {
    id: row.id,
    title: row.title,
    summary: text(row.summary),
    fundingBody: text(row.funding_body),
    source: row.source,
    level: oneOf(CALL_LEVELS, row.level),
    status: oneOf(CALL_STATUSES, row.status) ?? "unknown",
    recurring: row.recurring,
    deadline: row.deadline,
    score: row.score,
    fitLabel: row.score === null ? null : labelFor(row.score),
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    currency: row.currency,
    updatedAt: row.updated_at.toISOString(),
  };
}

function text(value: string | null) {
  return value?.trim() || null;
}

function oneOf<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? (value as T) : null;
}
