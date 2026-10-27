export type ReviewStatus = "GENERATED" | "OVERRIDDEN" | "DISMISSED";
export type FitLabel = "Strong fit" | "Good fit" | "Possible fit" | "Limited fit";

export interface MatchReason {
  id: string;
  title: string;
  description: string;
}

export interface MatchResult {
  id: string;
  overallScore: number;
  fitLabel: FitLabel;
  manualScore?: number;
  explanation: string;
  reviewStatus: ReviewStatus;
  reasons: MatchReason[];
}
