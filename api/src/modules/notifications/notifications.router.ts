import { Router } from "express";
import {
  listNotifications,
  patchNotification,
} from "./notifications.controller.ts";

export const notificationsRouter = Router()
  .get("/", listNotifications)
  .patch("/:id", patchNotification);
