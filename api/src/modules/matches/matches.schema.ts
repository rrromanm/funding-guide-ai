import { z } from "zod";

export const FIT_LABELS = [
  "strong_fit",
  "possible_fit",
  "weak_fit",
  "not_recommended",
] as const;
export const CONFIDENCES = ["high", "medium", "low"] as const;
export const PYN_MEETS = ["yes", "no", "unclear"] as const;
export const KEY_POINT_KINDS = [
  "blocker",
  "barrier",
  "strength",
  "info",
] as const;


const criterion = z.object({
  rating: z.number().int().min(0).max(4),
  evidence: z
    .string()
    .nullable()
    .describe("Verbatim quote from the call text, or null if it is silent."),
  reason: z.string().min(1),
});

const criteria = z.object({
  theme_match: criterion,
  target_group: criterion,
  maturity_fit: criterion,
  project_scale: criterion,
  partner_burden: criterion,
  deadline_readiness: criterion,
  complexity: criterion,
});

export const judgeOutput = z.object({
  eligibility: z.array(
    z.object({
      requirement: z.string().min(1),
      evidence: z.string().min(1),
      pyn_meets: z.enum(PYN_MEETS),
      reason: z.string().min(1),
    }),
  ),
  criteria: criteria,
  key_points: z.array(
    z.object({
      kind: z.enum(KEY_POINT_KINDS),
      about: z.enum([...criteria.keyof().options, "eligibility"]),
      text: z.string().min(1),
    }),
  ),
});

export type JudgeOutput = z.infer<typeof judgeOutput>;
export type Criterion = keyof JudgeOutput["criteria"];

// Responses

export const scoredCriterion = z.object({
  key: z.string(),
  weight: z.number(),
  rating: z.number(),
  points: z.number().describe("rating / 4 * weight"),
  evidence: z.string().nullable(),
  reason: z.string(),
});

export const droppedCriterion = scoredCriterion.extend({
  dropReason: z.string(),
});

export const eligibilityCheck = z.object({
  requirement: z.string(),
  evidence: z.string(),
  pynMeets: z.enum(PYN_MEETS),
  reason: z.string(),
  grounded: z
    .boolean()
    .describe("The evidence quote was found in the call text."),
});

export const keyPoint = z.object({
  kind: z.enum(KEY_POINT_KINDS),
  about: z.string().describe("A criterion key, or eligibility."),
  text: z.string(),
});

export const scoredResult = z.object({
  score: z.number().int().min(0).max(100),
  fitLabel: z.enum(FIT_LABELS),
  confidence: z.enum(CONFIDENCES),
  blockingReason: z
    .string()
    .nullable()
    .describe("Set when an eligibility requirement rules PYN out."),
  warnings: z.array(z.string()),
  criteria: z.array(scoredCriterion),
  eligibility: z.array(eligibilityCheck),
  droppedCriteria: z
    .array(droppedCriterion)
    .describe("Criteria whose evidence failed the grounding check; 0 points."),
  keyPoints: z
    .array(keyPoint)
    .describe(
      "The model's summary, filtered so it never contradicts the score.",
    ),
});

export type ScoredResult = z.infer<typeof scoredResult>;
