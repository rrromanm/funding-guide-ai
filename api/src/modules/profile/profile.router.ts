import { Router } from "express";
import { getProfile } from "./profile.controller.ts";

export const profileRouter = Router().get("/", getProfile);
