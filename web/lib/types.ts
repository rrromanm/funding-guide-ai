export type CallStatus = "UPCOMING" | "OPEN" | "CLOSED" | "UNKNOWN";
export type TagType = "Theme" | "TargetGroup" | "Sector" | "Country" | "Other";
export type ReviewStatus = "GENERATED" | "OVERRIDDEN" | "DISMISSED";
export type FitLabel = "Strong fit" | "Good fit" | "Possible fit" | "Limited fit";

export interface FundingSource {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface SourceCounts {
  total: number;
  relevant: number;
  open: number;
  closed: number;
}

export interface SourceListItem {
  key: string;
  name: string;
  sourceType: string | null;
  baseUrl: string | null;
  lastChecked: string | null;
  counts: SourceCounts;
}

export interface SourceListResponse {
  items: SourceListItem[];
}

export interface FundingRound {
  id: string;
  title: string;
  openDate?: string;
  deadline?: string;
  decisionDate?: string;
  expectedNextOpenDate?: string;
}

export interface Tag {
  id: string;
  value: string;
  type: TagType;
}

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

export interface OrgProfile {
  id: string;
  name: string;
  legalStatus: string;
  city: string;
  country: string;
  staffCount: number;
  administrativeCapacity: string;
  themes: Tag[];
  targetGroups: Tag[];
}

export interface Notification {
  id: string;
  fundingCallId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
