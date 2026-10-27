import type { MatchResult } from "./matches";
import type { Tag } from "./profile";
import type { FundingSource } from "./sources";

export type CallStatus = "UPCOMING" | "OPEN" | "CLOSED" | "UNKNOWN";
export type ApiCallStatus = "upcoming" | "open" | "closed" | "unknown";

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
}

export interface CreateFundingCallDto {
  title: string;
  description: string;
  summary?: string;
  eligibility?: string;
  fundingBody?: string;
  sourceUrl?: string;
  level?: string;
  funderType?: string;
  status?: ApiCallStatus;
  recurring?: boolean;
  ngoEligible?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  rounds?: Omit<FundingRoundDto, "roundNo">[];
  themes?: string[];
  targetGroups?: string[];
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
  matchResult?: MatchResult;
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
