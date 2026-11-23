import { Router } from "express";
import {
  getNotification,
  listNotifications,
  patchNotification,
  readAllNotifications,
} from "./notifications.controller.ts";

export const notificationsRouter = Router()
  .get("/", listNotifications)
  .post("/read-all", readAllNotifications)
  .get("/:id", getNotification)
  .patch("/:id", patchNotification);
