import type { RequestHandler } from "express";
import {
  notificationIdParams,
  updateNotificationBody,
} from "./notifications.schema.ts";
import {
  findNotification,
  findNotifications,
  markAllNotificationsRead,
  updateNotification,
} from "./notifications.service.ts";

export const listNotifications: RequestHandler = async (_req, res) => {
  res.json(await findNotifications());
};

export const getNotification: RequestHandler = async (req, res) => {
  const { id } = notificationIdParams.parse(req.params);

  res.json(await findNotification(id));
};

export const patchNotification: RequestHandler = async (req, res) => {
  const { id } = notificationIdParams.parse(req.params);
  const body = updateNotificationBody.parse(req.body);

  res.json(await updateNotification(id, body));
};

export const readAllNotifications: RequestHandler = async (_req, res) => {
  res.json(await markAllNotificationsRead());
};
