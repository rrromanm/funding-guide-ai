import { z } from "zod";

export const notificationItem = z.object({
  id: z.number(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const notificationListResponse = z.object({
  items: z.array(notificationItem),
});

export type NotificationItem = z.infer<typeof notificationItem>;
export type NotificationListResponse = z.infer<typeof notificationListResponse>;

export const notificationIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateNotificationBody = z.object({ read: z.boolean() }).strict();

export type UpdateNotificationBody = z.infer<typeof updateNotificationBody>;
