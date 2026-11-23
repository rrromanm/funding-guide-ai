import type { Selectable } from "kysely";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { Notification } from "../../lib/db-types.ts";
import {
  LIST_COLUMNS,
  matchScore,
  nextDeadline,
  toListItem,
} from "../calls/calls.service.ts";
import type {
  MarkAllReadResponse,
  NotificationDetail,
  NotificationItem,
  NotificationListResponse,
  UpdateNotificationBody,
} from "./notifications.schema.ts";

function toItem(row: Selectable<Notification>): NotificationItem {
  return {
    id: row.id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at.toISOString(),
  };
}

export async function findNotifications(): Promise<NotificationListResponse> {
  const rows = await db
    .selectFrom("notification")
    .selectAll()
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .execute();

  return { items: rows.map(toItem) };
}

export async function findNotification(
  id: number,
): Promise<NotificationDetail> {
  const row = await db
    .selectFrom("notification")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
  if (!row) throw new NotFoundError("Notification not found");

  const calls = await db
    .selectFrom("funding_call")
    .innerJoin(
      "funding_source",
      "funding_source.id",
      "funding_call.funding_source_id",
    )
    .select((eb) => [...LIST_COLUMNS, nextDeadline(eb), matchScore(eb)])
    .where("funding_call.deleted_at", "is", null)
    .where("funding_call.id", "in", (eb) =>
      eb
        .selectFrom("match_result")
        .select("call_id")
        .where("notification_id", "=", id),
    )
    .orderBy("score", (ob) => ob.desc().nullsLast())
    .orderBy("funding_call.id")
    .execute();

  return { ...toItem(row), fundingOpportunities: calls.map(toListItem) };
}

export async function updateNotification(
  id: number,
  { read }: UpdateNotificationBody,
): Promise<NotificationItem> {
  const row = await db
    .updateTable("notification")
    .set({ read })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) throw new NotFoundError("Notification not found");

  return toItem(row);
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  const { numUpdatedRows } = await db
    .updateTable("notification")
    .set({ read: true })
    .where("read", "=", false)
    .executeTakeFirst();

  return { updated: Number(numUpdatedRows) };
}

export async function notifyRelevantCalls(callIds: number[]) {
  if (callIds.length === 0) return;

  await db.transaction().execute(async (trx) => {
    const { id } = await trx
      .insertInto("notification")
      .values({
        message: `Found ${callIds.length} new relevant call${callIds.length === 1 ? "" : "s"}.`,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await trx
      .updateTable("match_result")
      .set({ notification_id: id })
      .where("call_id", "in", callIds)
      .execute();
  });
}
