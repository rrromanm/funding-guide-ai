import type { RequestHandler } from "express";
import {
  notificationIdParams,
  updateNotificationBody,
} from "./notifications.schema.ts";
import {
  findNotifications,
  updateNotification,
} from "./notifications.service.ts";

export const listNotifications: RequestHandler = async (_req, res) => {
  res.json(await findNotifications());
};

export const patchNotification: RequestHandler = async (req, res) => {
  const { id } = notificationIdParams.parse(req.params);
  const body = updateNotificationBody.parse(req.body);

  res.json(await updateNotification(id, body));
};
