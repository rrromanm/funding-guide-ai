import { Router } from "express";
import { deleteCallById, getCall, listCalls } from "./calls.controller.ts";

export const callsRouter = Router()
  .get("/", listCalls)
  .get("/:id", getCall)
  .delete("/:id", deleteCallById);
