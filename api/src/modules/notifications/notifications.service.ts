import { db } from "../../lib/db.ts";
import type { NotificationListResponse } from "./notifications.schema.ts";

export async function findNotifications(): Promise<NotificationListResponse> {
  const rows = await db
    .selectFrom("notification")
    .innerJoin("match_result", "match_result.id", "notification.match_id")
    .innerJoin("funding_call", "funding_call.id", "match_result.call_id")
    .select([
      "notification.id",
      "funding_call.id as call_id",
      "funding_call.title as call_title",
      "notification.message",
      "notification.read",
      "notification.created_at",
    ])
    .where("match_result.review_status", "!=", "dismissed")
    .orderBy("notification.created_at", "desc")
    .orderBy("notification.id", "desc")
    .execute();

  return {
    items: rows.map((row) => ({
      id: row.id,
      callId: row.call_id,
      callTitle: row.call_title,
      message: row.message,
      read: row.read,
      createdAt: row.created_at.toISOString(),
    })),
  };
}
