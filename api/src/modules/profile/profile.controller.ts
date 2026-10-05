import type { RequestHandler } from "express";
import { findProfile } from "./profile.service.ts";

export const getProfile: RequestHandler = async (_req, res) => {
  res.json(await findProfile());
};
