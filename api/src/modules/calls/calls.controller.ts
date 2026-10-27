import type { RequestHandler } from "express";
import {
  callIdParams,
  createCallBody,
  listCallsQuery,
} from "./calls.schema.ts";
import {
  createCall,
  deleteCall,
  findCallById,
  findCalls,
} from "./calls.service.ts";

export const listCalls: RequestHandler = async (req, res) => {
  const query = listCallsQuery.parse(req.query);

  res.json(await findCalls(query));
};

export const getCall: RequestHandler = async (req, res) => {
  const { id } = callIdParams.parse(req.params);

  res.json(await findCallById(id));
};

export const postCall: RequestHandler = async (req, res) => {
  const body = createCallBody.parse(req.body);

  res.status(201).json(await createCall(body));
};

export const deleteCallById: RequestHandler = async (req, res) => {
  const { id } = callIdParams.parse(req.params);

  await deleteCall(id);
  res.status(204).end();
};
