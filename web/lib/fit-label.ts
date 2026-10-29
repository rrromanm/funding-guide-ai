import type { ApiFitLabel } from "./types";

export const API_FIT_LABELS: ApiFitLabel[] = ["strong_fit", "possible_fit", "weak_fit", "not_recommended"];

export const FIT_LABELS: Record<ApiFitLabel, string> = {
  strong_fit: "Strong fit",
  possible_fit: "Possible fit",
  weak_fit: "Weak fit",
  not_recommended: "Not recommended",
};

export const FIT_LABEL_CHIPS: Record<ApiFitLabel, string> = {
  strong_fit: "chip-strong",
  possible_fit: "chip-possible",
  weak_fit: "chip-conditional",
  not_recommended: "chip-closed",
};
