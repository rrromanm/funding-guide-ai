import type { Selectable } from "kysely";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { Notification } from "../../lib/db-types.ts";
import type {
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

export async function notifyNewCalls(found: number, relevant: number) {
  if (found === 0) return;

  await db
    .insertInto("notification")
    .values({
      message: `Found ${found} new call${found === 1 ? "" : "s"}, ${relevant} relevant.`,
    })
    .execute();
}
