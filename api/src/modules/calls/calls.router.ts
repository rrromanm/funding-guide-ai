import { Router } from "express";
import {
  deleteCallById,
  getCall,
  listCalls,
  patchCall,
  postCall,
  rescoreCallById,
} from "./calls.controller.ts";

export const callsRouter = Router()
  .get("/", listCalls)
  .post("/", postCall)
  .get("/:id", getCall)
  .patch("/:id", patchCall)
  .post("/:id/score", rescoreCallById)
  .delete("/:id", deleteCallById);
