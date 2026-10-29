import type { MatchResult } from "./matches";
import type { Tag } from "./profile";
import type { FundingSource } from "./sources";

export type CallStatus = "UPCOMING" | "OPEN" | "CLOSED" | "UNKNOWN";
export type ApiCallStatus = "upcoming" | "open" | "closed" | "unknown";
export type ApiFitLabel = "strong_fit" | "possible_fit" | "weak_fit" | "not_recommended";
export type ApiConfidence = "high" | "medium" | "low";

export interface MatchReasonDto {
  kind: "blocker" | "barrier" | "strength" | "info";
  about: string | null;
  message: string;
}

export interface FundingCallListItemDto {
  id: number;
  title: string;
  summary: string | null;
  fundingBody: string | null;
  source: string;
  level: string | null;
  status: ApiCallStatus;
  recurring: boolean;
  deadline: string | null;
  score: number | null;
  fitLabel: ApiFitLabel | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  updatedAt: string;
}

export interface FundingCallListResponseDto {
  items: FundingCallListItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface FundingRoundDto {
  roundNo: number | null;
  openDate: string | null;
  deadlineDate: string | null;
  decisionDate: string | null;
  expectedNextOpenDate: string | null;
}

export interface FundingCallDetailDto extends FundingCallListItemDto {
  description: string | null;
  eligibility: string | null;
  ngoEligible: boolean | null;
  funderType: string | null;
  themes: string[];
  targetGroups: string[];
  sourceUrl: string | null;
  externalId: string | null;
  lastChecked: string | null;
  createdAt: string;
  rounds: FundingRoundDto[];
  confidence: ApiConfidence | null;
  blockingReason: string | null;
  reasons: MatchReasonDto[];
}

export interface FundingCallBodyDto {
  title: string;
  description: string;
  summary: string;
  eligibility: string;
  fundingBody: string;
  sourceUrl: string | null;
  level: string | null;
  funderType: string | null;
  status: ApiCallStatus;
  recurring: boolean;
  ngoEligible: boolean | null;
  budgetMin: number | null;
  budgetMax: number | null;
  rounds: Omit<FundingRoundDto, "roundNo">[];
  themes: string[];
  targetGroups: string[];
}

export interface FundingCallListItem {
  id: string;
  title: string;
  summary: string;
  fundingBody: string;
  fundingLevel: string;
  source: string;
  status: CallStatus;
  recurringCall: boolean;
  deadline?: string;
  score?: number;
  fitLabel?: ApiFitLabel;
  amountMin?: number;
  amountMax?: number;
  currency: string;
  themes?: Tag[];
  relevantRegions?: string[];
}

export interface FundingCallDetails {
  id: string;
  title: string;
  summary: string;
  description: string;
  fundingBody: string;
  fundingLevel: string;
  funderType?: string;
  amountMin?: number;
  amountMax?: number;
  currency: string;
  score?: number;
  eligibility: string;
  ngoEligible: boolean | null;
  status: CallStatus;
  recurringCall: boolean;
  expectedReopeningDate?: string;
  sourceUrl?: string;
  themes: Tag[];
  targetGroups?: Tag[];
  fundingRounds: FundingRound[];
  fitLabel?: ApiFitLabel;
  confidence?: ApiConfidence;
  blockingReason?: string;
  reasons: MatchReasonDto[];
}

export interface FundingRound {
  id: string;
  title: string;
  openDate?: string;
  deadline?: string;
  decisionDate?: string;
  expectedNextOpenDate?: string;
}

export interface FundingCall {
  id: string;
  title: string;
  summary: string;
  description: string;
  fundingBody: string;
  fundingLevel: string;
  funderType?: string;
  amountMin?: number;
  amountMax?: number;
  eligibility: string;
  ngoEligible?: boolean;
  status: CallStatus;
  recurringCall?: boolean;
  expectedReopeningDate?: string;
  sourceUrl?: string;
  source?: FundingSource;
  themes: Tag[];
  targetGroups: Tag[];
  fundingRounds: FundingRound[];
  relevantRegions?: string[];
  matchResult: MatchResult;
}
