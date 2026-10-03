import { Router } from "express";
import { listNotifications } from "./notifications.controller.ts";

export const notificationsRouter = Router().get("/", listNotifications);
