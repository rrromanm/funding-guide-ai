import type { RequestHandler } from "express";
import { updateProfileBody } from "./profile.schema.ts";
import { findProfile, updateProfile } from "./profile.service.ts";

export const getProfile: RequestHandler = async (_req, res) => {
  res.json(await findProfile());
};

export const patchProfile: RequestHandler = async (req, res) => {
  const body = updateProfileBody.parse(req.body);

  res.json(await updateProfile(body));
};
