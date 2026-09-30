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
export const DEADLINE_TYPES = [
  "fixed",
  "multi_round",
  "rolling",
  "unknown",
] as const;
export const RECORD_KINDS = ["call", "stub", "info_page"] as const;
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export const THEMES = [
  "local_community",
  "youth",
  "student",
  "social",
  "international",
  "green",
] as const;
export const DK_REGIONS = [
  "Hovedstaden",
  "Sjælland",
  "Syddanmark",
  "Midtjylland",
  "Nordjylland",
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
  source: z.string(),
  level: z.enum(CALL_LEVELS).nullable(),
  status: z.enum(CALL_STATUSES),
  deadlineType: z.enum(DEADLINE_TYPES),
  deadline: z
    .string()
    .nullable()
    .describe(
      "Nearest round deadline still ahead. Null for rolling calls and calls whose rounds have all passed.",
    ),
  amountsKr: z.array(z.number()),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable(),
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
  recordKind: z.enum(RECORD_KINDS),
  themes: z.array(z.enum(THEMES)),
  region: z.enum(DK_REGIONS).nullable(),
  municipality: z.string().nullable(),
  sourceUrl: z.string(),
  missingFields: z.array(z.string()),
  completeness: z.number().nullable(),
  lastChecked: z.string().nullable(),
  createdAt: z.string(),
  rounds: z.array(callRound),
});

export type CallListItem = z.infer<typeof callListItem>;
export type CallListResponse = z.infer<typeof callListResponse>;
export type CallDetail = z.infer<typeof callDetail>;
