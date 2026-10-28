import type { RequestHandler } from "express";
import { findSources, startPipeline } from "./sources.service.ts";

export const listSources: RequestHandler = async (_req, res) => {
  res.json(await findSources());
};

export const checkSources: RequestHandler = async (_req, res) => {
  await startPipeline();
  res.status(202).end();
};
