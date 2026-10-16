import type { Criterion } from "./matches.schema.ts";

export const WEIGHTS: Record<Criterion, number> = {
  theme_match: 25,
  target_group: 20,
  maturity_fit: 15,
  project_scale: 10,
  partner_burden: 10,
  deadline_readiness: 10,
  complexity: 10,
};

export const LABEL_THRESHOLDS = {
  strong_fit: 75,
  possible_fit: 50,
  weak_fit: 25,
};

export const CONFIDENCE_MAX_ISSUES = { high: 0, medium: 2 };

export const MIN_DESCRIPTION_CHARS = 500;
