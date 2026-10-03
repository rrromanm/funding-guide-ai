import type { RequestHandler } from "express";
import { findSources } from "./sources.service.ts";

export const listSources: RequestHandler = async (_req, res) => {
  res.json(await findSources());
};
