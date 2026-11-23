import { z } from "zod";
import { callListItem } from "../calls/calls.schema.ts";

export const notificationItem = z.object({
  id: z.number(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const notificationListResponse = z.object({
  items: z.array(notificationItem),
});

export const notificationDetail = notificationItem.extend({
  fundingOpportunities: z
    .array(callListItem)
    .describe("The new relevant calls the notification is about."),
});

export const markAllReadResponse = z.object({
  updated: z.number().describe("How many unread notifications it marked read."),
});

export type NotificationItem = z.infer<typeof notificationItem>;
export type NotificationListResponse = z.infer<typeof notificationListResponse>;
export type NotificationDetail = z.infer<typeof notificationDetail>;
export type MarkAllReadResponse = z.infer<typeof markAllReadResponse>;

export const notificationIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateNotificationBody = z.object({ read: z.boolean() }).strict();

export type UpdateNotificationBody = z.infer<typeof updateNotificationBody>;
