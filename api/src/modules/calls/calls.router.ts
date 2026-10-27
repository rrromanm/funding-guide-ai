import { Router } from "express";
import {
  deleteCallById,
  getCall,
  listCalls,
  postCall,
} from "./calls.controller.ts";

export const callsRouter = Router()
  .get("/", listCalls)
  .post("/", postCall)
  .get("/:id", getCall)
  .delete("/:id", deleteCallById);
