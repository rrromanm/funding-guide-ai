import { fundingCalls as initialFundingCalls, notifications as initialNotifications, orgProfile as initialOrgProfile } from "./mock-data";
import type {
  ApiCallStatus,
  CallStatus,
  FitLabel,
  FundingCall,
  FundingCallListItem,
  FundingCallListItemDto,
  FundingCallListResponseDto,
  Notification,
  OrgProfile,
  SourceListResponse,
} from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function isSourceListResponse(value: unknown): value is SourceListResponse {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    return false;
  }

  return value.items.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const source = item as Record<string, unknown>;
    const counts = source.counts;
    return (
      typeof source.id === "number" &&
      typeof source.name === "string" &&
      (source.sourceType === null || typeof source.sourceType === "string") &&
      (source.baseUrl === null || typeof source.baseUrl === "string") &&
      (source.lastChecked === null || typeof source.lastChecked === "string") &&
      !!counts &&
      typeof counts === "object" &&
      ["total", "relevant", "open", "closed"].every(
        (field) => typeof (counts as Record<string, unknown>)[field] === "number",
      )
    );
  });
}

function isCallListResponse(value: unknown): value is FundingCallListResponseDto {
  if (
    !value ||
    typeof value !== "object" ||
    !("items" in value) ||
    !Array.isArray(value.items) ||
    typeof (value as Record<string, unknown>).total !== "number" ||
    typeof (value as Record<string, unknown>).limit !== "number" ||
    typeof (value as Record<string, unknown>).offset !== "number"
  ) {
    return false;
  }

  return value.items.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const call = item as Record<string, unknown>;
    return (
      typeof call.id === "number" &&
      typeof call.title === "string" &&
      (call.summary === null || typeof call.summary === "string") &&
      (call.fundingBody === null || typeof call.fundingBody === "string") &&
      typeof call.source === "string" &&
      (call.level === null || typeof call.level === "string") &&
      ["upcoming", "open", "closed", "unknown"].includes(call.status as string) &&
      typeof call.recurring === "boolean" &&
      (call.deadline === null || typeof call.deadline === "string") &&
      (call.budgetMin === null || typeof call.budgetMin === "number") &&
      (call.budgetMax === null || typeof call.budgetMax === "number") &&
      typeof call.currency === "string" &&
      typeof call.updatedAt === "string"
    );
  });
}

function mapCallStatus(status: ApiCallStatus): CallStatus {
  return status.toUpperCase() as CallStatus;
}

function mapFundingCallListItem(call: FundingCallListItemDto): FundingCallListItem {
  return {
    id: String(call.id),
    title: call.title,
    summary: call.summary ?? "",
    fundingBody: call.fundingBody ?? "",
    fundingLevel: call.level ?? "",
    source: call.source,
    status: mapCallStatus(call.status),
    recurringCall: call.recurring,
    deadline: call.deadline ?? undefined,
    amountMin: call.budgetMin ?? undefined,
    amountMax: call.budgetMax ?? undefined,
    currency: call.currency,
  };
}

async function fetchCallPage(query: string): Promise<FundingCallListResponseDto> {
  const response = await fetch(`${apiBaseUrl}/api/calls?${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Funding calls endpoint returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isCallListResponse(payload)) {
    throw new Error("Funding calls endpoint returned an unexpected response");
  }

  return payload;
}

async function fetchAllCallPages(status?: ApiCallStatus): Promise<FundingCallListItemDto[]> {
  const items: FundingCallListItemDto[] = [];
  const limit = 100;
  let offset = 0;
  let total = 0;

  do {
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) {
      query.set("status", status);
    }

    const page = await fetchCallPage(query.toString());
    items.push(...page.items);
    total = page.total;
    offset += page.items.length;

    if (page.items.length === 0) {
      break;
    }
  } while (offset < total);

  return items;
}

export async function getFundingSources(): Promise<SourceListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/sources`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Source endpoint returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isSourceListResponse(payload)) {
    throw new Error("Source endpoint returned an unexpected response");
  }

  return payload;
}

export async function getFundingCalls(): Promise<FundingCallListItem[]> {
  const [currentCalls, closedCalls] = await Promise.all([
    fetchAllCallPages(),
    fetchAllCallPages("closed"),
  ]);
  const uniqueCalls = new Map<number, FundingCallListItemDto>();

  [...currentCalls, ...closedCalls].forEach((call) => uniqueCalls.set(call.id, call));
  return [...uniqueCalls.values()].map(mapFundingCallListItem);
}

export function getFundingCall(id: string): FundingCall | undefined {
  return structuredClone(initialFundingCalls.find((call) => call.id === id));
}

export function createFundingCall(payload: Omit<FundingCall, "id" | "matchResult"> & { id?: string }): FundingCall {
  const call: FundingCall = {
    ...payload,
    id: payload.id ?? `call-${Date.now()}`,
    matchResult: {
      id: `match-${Date.now()}`,
      overallScore: 80,
      reviewStatus: "GENERATED",
      fitLabel: "Good fit",
      explanation: "The opportunity matches the organisation profile and should be reviewed by the PYN admin team.",
      reasons: [
        {
          id: `reason-${Date.now()}`,
          title: "Profile alignment",
          description: "This call is broadly aligned with the current organisational profile.",
        },
      ],
    },
  };

  initialFundingCalls.push(call);
  return structuredClone(call);
}

export function updateFundingCall(id: string, updates: Partial<FundingCall>): FundingCall | undefined {
  const index = initialFundingCalls.findIndex((call) => call.id === id);
  if (index === -1) {
    return undefined;
  }

  const next = { ...initialFundingCalls[index], ...updates };
  initialFundingCalls[index] = next;
  return structuredClone(next);
}

export function deleteFundingCall(id: string): boolean {
  const index = initialFundingCalls.findIndex((call) => call.id === id);
  if (index === -1) {
    return false;
  }

  initialFundingCalls.splice(index, 1);
  return true;
}

export function getOrgProfile(): OrgProfile {
  return structuredClone(initialOrgProfile);
}

export function updateOrgProfile(updates: Partial<OrgProfile>): OrgProfile {
  const next = { ...initialOrgProfile, ...updates };
  Object.assign(initialOrgProfile, next);
  return structuredClone(next);
}

export function getNotifications(): Notification[] {
  return structuredClone(initialNotifications);
}

export function markNotificationRead(id: string): Notification | undefined {
  const item = initialNotifications.find((notification) => notification.id === id);
  if (!item) {
    return undefined;
  }

  item.read = true;
  return structuredClone(item);
}

export function overrideRecommendation(
  id: string,
  fitLabel: FitLabel,
  manualScore?: number,
  reason?: string,
): FundingCall | undefined {
  const call = initialFundingCalls.find((item) => item.id === id);
  if (!call) {
    return undefined;
  }

  call.matchResult.fitLabel = fitLabel;
  call.matchResult.manualScore = manualScore;
  call.matchResult.overallScore = manualScore ?? call.matchResult.overallScore;
  call.matchResult.reviewStatus = "OVERRIDDEN";
  call.matchResult.explanation = reason ?? call.matchResult.explanation;
  return structuredClone(call);
}

export function dismissRecommendation(id: string): FundingCall | undefined {
  const call = initialFundingCalls.find((item) => item.id === id);
  if (!call) {
    return undefined;
  }

  call.matchResult.reviewStatus = "DISMISSED";
  return structuredClone(call);
}
