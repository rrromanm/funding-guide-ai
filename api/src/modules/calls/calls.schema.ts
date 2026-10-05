import { z } from "zod";

export const CALL_STATUSES = ["upcoming", "open", "closed", "unknown"] as const;
export const CALL_LEVELS = [
  "local",
  "municipal",
  "regional",
  "national",
  "nordic",
  "eu",
] as const;
export const FUNDER_TYPES = [
  "public_pool",
  "foundation",
  "eu_programme",
  "other",
] as const;

// Requests

export const listCallsQuery = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  status: z.enum(CALL_STATUSES).optional(),
  level: z.enum(CALL_LEVELS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const callIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export type ListCallsQuery = z.infer<typeof listCallsQuery>;

// Responses

export const callListItem = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string().nullable(),
  fundingBody: z.string().nullable(),
  source: z.string().describe("Name of the funding_source the call came from."),
  level: z.enum(CALL_LEVELS).nullable(),
  status: z.enum(CALL_STATUSES),
  recurring: z
    .boolean()
    .describe("The call runs in rounds and is expected to reopen."),
  deadline: z
    .string()
    .nullable()
    .describe(
      "Nearest round deadline still ahead. Null for recurring calls between rounds and calls whose rounds have all passed.",
    ),
  score: z
    .number()
    .nullable()
    .describe(
      "Match score 0-100 (manual override wins). Null until the worker scores the call.",
    ),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  currency: z.string(),
  updatedAt: z.string(),
});

export const callListResponse = z.object({
  items: z.array(callListItem),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const callRound = z.object({
  roundNo: z.number().nullable(),
  openDate: z.string().nullable(),
  deadlineDate: z.string().nullable(),
  decisionDate: z.string().nullable(),
  expectedNextOpenDate: z.string().nullable(),
});

export const callDetail = callListItem.extend({
  description: z.string().nullable(),
  eligibility: z.string().nullable(),
  ngoEligible: z.boolean().nullable(),
  funderType: z.enum(FUNDER_TYPES).nullable(),
  themes: z.array(z.string()).describe("Theme tags on the call."),
  sourceUrl: z
    .string()
    .nullable()
    .describe("Null for a call added by hand without one."),
  externalId: z.string().nullable(),
  lastChecked: z
    .string()
    .nullable()
    .describe("When a scraper run last visited this call's source."),
  createdAt: z.string(),
  rounds: z.array(callRound),
});

export type CallListItem = z.infer<typeof callListItem>;
export type CallListResponse = z.infer<typeof callListResponse>;
export type CallDetail = z.infer<typeof callDetail>;
