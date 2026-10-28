import { z } from "zod";
import { MIN_DESCRIPTION_CHARS } from "../matches/matches.config.ts";
import {
  CONFIDENCES,
  FIT_LABELS,
  KEY_POINT_KINDS,
} from "../matches/matches.schema.ts";

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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((text) => text || null)
    .nullable()
    .optional();
const date = z.iso.date().nullable().optional();
const labels = z.array(z.string().trim().min(1).max(100)).max(50).optional();

export const createCallBody = z.strictObject({
  title: z.string().trim().min(1).max(300),
  summary: optionalText(2000),
  description: z
    .string()
    .trim()
    .min(MIN_DESCRIPTION_CHARS)
    .max(20000)
    .describe(
      "The full call text. The AI scores from it, so paste everything the call says.",
    ),
  eligibility: optionalText(5000),
  fundingBody: optionalText(200),
  sourceUrl: z.url().nullable().optional(),
  level: z.enum(CALL_LEVELS).nullable().optional(),
  funderType: z.enum(FUNDER_TYPES).nullable().optional(),
  status: z
    .enum(CALL_STATUSES)
    .optional()
    .describe("Left out: derived from the round deadlines, else `unknown`."),
  recurring: z.boolean().optional(),
  ngoEligible: z.boolean().nullable().optional(),
  budgetMin: z.number().min(0).nullable().optional(),
  budgetMax: z.number().min(0).nullable().optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .describe("ISO 4217 code. Defaults to DKK."),
  rounds: z
    .array(
      z.strictObject({
        openDate: date,
        deadlineDate: date,
        decisionDate: date,
        expectedNextOpenDate: date,
      }),
    )
    .max(20)
    .optional()
    .describe("`roundNo` is the position in the list."),
  themes: labels,
  targetGroups: labels,
});

export const updateCallBody = createCallBody.partial();

export type ListCallsQuery = z.infer<typeof listCallsQuery>;
export type CreateCallBody = z.infer<typeof createCallBody>;
export type UpdateCallBody = z.infer<typeof updateCallBody>;

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
      "Match score 0-100 (manual override wins). Null until the scoring job reaches the call.",
    ),
  fitLabel: z
    .enum(FIT_LABELS)
    .nullable()
    .describe("The AI recommendation, from `score`. Null when unscored."),
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
  targetGroups: z.array(z.string()).describe("Target group tags on the call."),
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
  confidence: z
    .enum(CONFIDENCES)
    .nullable()
    .describe(
      "How sure the AI is: lower when call data or eligibility is unclear.",
    ),
  blockingReason: z
    .string()
    .nullable()
    .describe("The eligibility requirement that rules PYN out, if any."),
  reasons: z
    .array(
      z.object({
        kind: z.enum(KEY_POINT_KINDS),
        about: z
          .string()
          .nullable()
          .describe("The criterion the reason is about, or eligibility."),
        message: z.string(),
      }),
    )
    .describe("The recommendation's explanation, most important first."),
});

export type CallListItem = z.infer<typeof callListItem>;
export type CallListResponse = z.infer<typeof callListResponse>;
export type CallDetail = z.infer<typeof callDetail>;
