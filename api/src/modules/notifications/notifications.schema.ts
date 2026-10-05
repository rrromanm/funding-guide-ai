import { z } from "zod";

export const notificationItem = z.object({
  id: z.number(),
  callId: z.number().describe("The funding call the notification is about."),
  callTitle: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const notificationListResponse = z.object({
  items: z.array(notificationItem),
});

export type NotificationItem = z.infer<typeof notificationItem>;
export type NotificationListResponse = z.infer<typeof notificationListResponse>;
