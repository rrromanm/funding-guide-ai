import { sql, type ExpressionBuilder } from "kysely";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { DB } from "../../lib/db-types.ts";
import {
  CALL_LEVELS,
  CALL_STATUSES,
  FUNDER_TYPES,
  type CallDetail,
  type CallListItem,
  type CallListResponse,
  type ListCallsQuery,
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

function filters(
  eb: ExpressionBuilder<DB, Queried>,
  { q, status, level }: ListCallsQuery,
) {
  const conditions = [
    status
      ? eb("funding_call.status", "=", status)
      : eb("funding_call.status", "!=", "closed"),
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
      .select((eb) => [...LIST_COLUMNS, nextDeadline(eb)])
      .where((eb) => filters(eb, query))
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
    .select((eb) => [...DETAIL_COLUMNS, nextDeadline(eb)])
    .where("funding_call.id", "=", id)
    .executeTakeFirst();

  if (!row) throw new NotFoundError("Call not found");

  const [themes, rounds] = await Promise.all([
    db
      .selectFrom("funding_call_tag")
      .innerJoin("tag", "tag.id", "funding_call_tag.tag_id")
      .select("tag.label")
      .where("funding_call_tag.call_id", "=", id)
      .where("tag.type", "=", "theme")
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
  ]);

  return {
    ...toListItem(row),
    description: text(row.description),
    eligibility: text(row.eligibility),
    ngoEligible: row.ngo_eligible,
    funderType: oneOf(FUNDER_TYPES, row.funder_type),
    themes: themes.map((theme) => theme.label),
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
  };
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
