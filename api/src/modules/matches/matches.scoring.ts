import {
  CONFIDENCE_MAX_ISSUES,
  LABEL_THRESHOLDS,
  WEIGHTS,
} from "./matches.config.ts";
import type { Criterion, JudgeOutput, ScoredResult } from "./matches.schema.ts";

export function normalise(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’‚‛´`]/g, "'")
    .replace(/[“”„‟«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function isGrounded(quote: string, callText: string) {
  const needle = normalise(quote).replace(/^["'.…\s]+|["'.…\s]+$/g, "");
  return needle.length > 0 && normalise(callText).includes(needle);
}

export function groundCheck(output: JudgeOutput, callText: string) {
  const criteria: ScoredResult["criteria"] = [];
  const droppedCriteria: ScoredResult["droppedCriteria"] = [];

  for (const key of Object.keys(WEIGHTS) as Criterion[]) {
    const { rating, evidence, reason } = output.criteria[key];
    const weight = WEIGHTS[key];
    const scored = {
      key,
      weight,
      rating,
      points: (rating / 4) * weight,
      evidence,
      reason,
    };

    if (evidence === null || isGrounded(evidence, callText))
      criteria.push(scored);
    else
      droppedCriteria.push({
        ...scored,
        points: 0,
        dropReason: "evidence quote not found in call text",
      });
  }

  const eligibility = output.eligibility.map((entry) => {
    const grounded = isGrounded(entry.evidence, callText);
    const pynMeets =
      !grounded && entry.pyn_meets === "no" ? "unclear" : entry.pyn_meets;
    return {
      requirement: entry.requirement,
      evidence: entry.evidence,
      pynMeets,
      reason: entry.reason,
      grounded,
    };
  });

  return {
    criteria,
    droppedCriteria,
    eligibility,
    keyPoints: output.key_points,
  };
}

const MAX_KEY_POINTS = 4;

// The model writes key points before code computes the score
export function keyPointsFor(
  points: ReturnType<typeof groundCheck>["keyPoints"],
  dropped: string[],
  blockers: { reason: string }[],
): ScoredResult["keyPoints"] {
  const blocked = blockers.length > 0;
  const kept = points
    .filter((p) => !dropped.includes(p.about))
    .filter((p) => !(blocked && p.kind === "strength"))
    .map((p) =>
      !blocked && p.kind === "blocker" ? { ...p, kind: "barrier" as const } : p,
    );
  if (blocked && !kept.some((p) => p.kind === "blocker"))
    kept.unshift({
      kind: "blocker",
      about: "eligibility",
      text: blockers[0].reason,
    });
  return kept.slice(0, MAX_KEY_POINTS);
}

export function labelFor(score: number): ScoredResult["fitLabel"] {
  if (score >= LABEL_THRESHOLDS.strong_fit) return "strong_fit";
  if (score >= LABEL_THRESHOLDS.possible_fit) return "possible_fit";
  if (score >= LABEL_THRESHOLDS.weak_fit) return "weak_fit";
  return "not_recommended";
}

export function confidenceFor(issues: number): ScoredResult["confidence"] {
  if (issues <= CONFIDENCE_MAX_ISSUES.high) return "high";
  if (issues <= CONFIDENCE_MAX_ISSUES.medium) return "medium";
  return "low";
}

export function aggregate(
  {
    criteria,
    droppedCriteria,
    eligibility,
    keyPoints: rawKeyPoints,
  }: ReturnType<typeof groundCheck>,
  missingData: string[],
): ScoredResult {
  const blockers = eligibility.filter((entry) => entry.pynMeets === "no");
  const unclear = eligibility.filter((entry) => entry.pynMeets === "unclear");

  const warnings = [
    ...eligibility
      .filter((entry) => !entry.grounded)
      .map(
        (entry) =>
          `Eligibility quote not found in call text: "${entry.evidence}"`,
      ),
    ...unclear.map(
      (entry) =>
        `Unclear whether PYN meets: ${entry.requirement}. ${entry.reason}`,
    ),
    ...droppedCriteria.map((c) => `${c.key} dropped: ${c.dropReason}`),
    ...missingData.map((field) => `Call data missing: ${field}`),
  ];
  const confidence = confidenceFor(
    unclear.length + droppedCriteria.length + missingData.length,
  );
  const keyPoints = keyPointsFor(
    rawKeyPoints,
    droppedCriteria.map((c) => c.key),
    blockers,
  );

  if (blockers.length > 0) {
    return {
      score: 0,
      fitLabel: "not_recommended",
      confidence,
      blockingReason: blockers
        .map((b) => `${b.requirement} ("${b.evidence}"). ${b.reason}`)
        .join(" "),
      warnings,
      criteria,
      eligibility,
      droppedCriteria,
      keyPoints,
    };
  }

  const score = Math.round(criteria.reduce((sum, c) => sum + c.points, 0));
  return {
    score,
    fitLabel: labelFor(score),
    confidence,
    blockingReason: null,
    warnings,
    criteria,
    eligibility,
    droppedCriteria,
    keyPoints,
  };
}
