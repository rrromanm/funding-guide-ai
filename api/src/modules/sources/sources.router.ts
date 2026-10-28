import { Router } from "express";
import { checkSources, listSources } from "./sources.controller.ts";

export const sourcesRouter = Router()
  .get("/", listSources)
  .post("/check", checkSources);
