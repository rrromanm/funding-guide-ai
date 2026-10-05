import { Router } from "express";
import { listSources } from "./sources.controller.ts";

export const sourcesRouter = Router().get("/", listSources);
