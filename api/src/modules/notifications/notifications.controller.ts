import type { RequestHandler } from "express";
import { findNotifications } from "./notifications.service.ts";

export const listNotifications: RequestHandler = async (_req, res) => {
  res.json(await findNotifications());
};
