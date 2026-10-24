import { Router } from "express";
import { getProfile, patchProfile } from "./profile.controller.ts";

export const profileRouter = Router()
  .get("/", getProfile)
  .patch("/", patchProfile);
