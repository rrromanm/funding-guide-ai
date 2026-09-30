import { Router } from "express";
import { getCall, listCalls } from "./calls.controller.ts";

export const callsRouter = Router().get("/", listCalls).get("/:id", getCall);
