import { sql, type ExpressionBuilder, type Selectable } from "kysely";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { DB, FundingCall } from "../../lib/db-types.ts";
import {
  CALL_LEVELS,
  CALL_STATUSES,
  CONFIDENCE_LEVELS,
  DEADLINE_TYPES,
  FUNDER_TYPES,
  RECORD_KINDS,
  THEMES,
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
  "funding_call.source",
  "funding_call.level",
  "funding_call.status",
  "funding_call.deadline_type",
  "funding_call.amounts_kr",
  "funding_call.confidence",
  "funding_call.updated_at",
] as const;

const DETAIL_COLUMNS = [
  ...LIST_COLUMNS,
  "funding_call.description",
  "funding_call.eligibility",
  "funding_call.ngo_eligible",
  "funding_call.funder_type",
  "funding_call.record_kind",
  "funding_call.region",
  "funding_call.municipality",
  "funding_call.source_url",
  "funding_call.missing_fields",
  "funding_call.completeness",
  "funding_call.last_checked",
  "funding_call.created_at",
] as const;

function nextDeadline(eb: ExpressionBuilder<DB, "funding_call">) {
  return eb
    .selectFrom("funding_round")
    .select(({ fn }) => fn.min("funding_round.deadline_date").as("deadline"))
    .whereRef("funding_round.call_id", "=", "funding_call.id")
    .where("funding_round.deadline_date", ">=", sql<string>`current_date`)
    .as("deadline");
}

function filters(
  eb: ExpressionBuilder<DB, "funding_call">,
  { q, status, level }: ListCallsQuery,
) {
  const conditions = [
    eb("funding_call.record_kind", "!=", "info_page"),
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
      .select((eb) => [...LIST_COLUMNS, nextDeadline(eb)])
      .where((eb) => filters(eb, query))
      .orderBy(sql`deadline asc nulls last`)
      .orderBy("funding_call.id")
      .limit(query.limit)
      .offset(query.offset)
      .execute(),
    db
      .selectFrom("funding_call")
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
    .select((eb) => [
      ...DETAIL_COLUMNS,
      nextDeadline(eb),
      sql<string[]>`funding_call.themes::text[]`.as("themes"),
    ])
    .where("funding_call.id", "=", id)
    .executeTakeFirst();

  if (!row) throw new NotFoundError("Call not found");

  const rounds = await db
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
    .execute();

  return {
    ...toListItem(row),
    description: text(row.description),
    eligibility: text(row.eligibility),
    ngoEligible: row.ngo_eligible,
    funderType: oneOf(FUNDER_TYPES, row.funder_type),
    recordKind: oneOf(RECORD_KINDS, row.record_kind) ?? "call",
    themes: allOf(THEMES, row.themes),
    region: row.region,
    municipality: text(row.municipality),
    sourceUrl: row.source_url,
    missingFields: row.missing_fields,
    completeness: row.completeness,
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

// Derived from the generated table type, so the column list stays the single source of truth.
type ListRow = Pick<
  Selectable<FundingCall>,
  | "id"
  | "title"
  | "summary"
  | "funding_body"
  | "source"
  | "level"
  | "status"
  | "deadline_type"
  | "amounts_kr"
  | "confidence"
  | "updated_at"
> & { deadline: string | null };

function toListItem(row: ListRow): CallListItem {
  return {
    id: row.id,
    title: row.title,
    summary: text(row.summary),
    fundingBody: text(row.funding_body),
    source: row.source,
    level: oneOf(CALL_LEVELS, row.level),
    status: oneOf(CALL_STATUSES, row.status) ?? "unknown",
    deadlineType: oneOf(DEADLINE_TYPES, row.deadline_type) ?? "unknown",
    deadline: row.deadline,
    amountsKr: row.amounts_kr,
    confidence: oneOf(CONFIDENCE_LEVELS, row.confidence),
    updatedAt: row.updated_at.toISOString(),
  };
}

function text(value: string | null) {
  return value?.trim() || null;
}

function allOf<T extends string>(values: readonly T[], list: string[]) {
  return list.filter((item): item is T => values.includes(item as T));
}

function oneOf<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? (value as T) : null;
}
