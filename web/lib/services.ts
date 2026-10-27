import { fundingCalls as initialFundingCalls, notifications as initialNotifications } from "./mock-data";
import type {
  ApiCallStatus,
  CallStatus,
  FitLabel,
  FundingCall,
  FundingCallBodyDto,
  FundingCallDetailDto,
  FundingCallDetails,
  FundingCallListItem,
  FundingCallListItemDto,
  FundingCallListResponseDto,
  Notification,
  OrgProfile,
  OrgProfileDto,
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
      (call.score === null || typeof call.score === "number") &&
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
    score: call.score ?? undefined,
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

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isOrgProfileResponse(value: unknown): value is OrgProfileDto {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === "number" &&
    typeof profile.name === "string" &&
    typeof profile.legalStatus === "string" &&
    typeof profile.city === "string" &&
    typeof profile.country === "string" &&
    (profile.foundedYear === null || typeof profile.foundedYear === "number") &&
    typeof profile.staffCount === "number" &&
    (profile.adminCapacity === null || typeof profile.adminCapacity === "string") &&
    Array.isArray(profile.themes) && profile.themes.every((theme) => typeof theme === "string") &&
    Array.isArray(profile.targetGroups) && profile.targetGroups.every((targetGroup) => typeof targetGroup === "string")
  );
}

function mapOrgProfile(profile: OrgProfileDto): OrgProfile {
  return {
    id: String(profile.id),
    name: profile.name,
    legalStatus: profile.legalStatus,
    city: profile.city,
    country: profile.country,
    staffCount: profile.staffCount,
    administrativeCapacity: profile.adminCapacity ?? "",
    themes: profile.themes.map((value, index) => ({ id: `profile-theme-${index}-${value}`, value, type: "Theme" })),
    targetGroups: profile.targetGroups.map((value, index) => ({ id: `profile-target-group-${index}-${value}`, value, type: "TargetGroup" })),
  };
}

async function parseOrgProfileResponse(response: Response, action: string): Promise<OrgProfile> {
  if (response.status === 404) {
    throw new ApiRequestError("Organization profile was not found", 404);
  }
  if (!response.ok) {
    throw new ApiRequestError(`Organization profile could not be ${action}`, response.status);
  }

  const payload: unknown = await response.json();
  if (!isOrgProfileResponse(payload)) {
    throw new ApiRequestError("Organization profile returned an unexpected response", 502);
  }

  return mapOrgProfile(payload);
}

export async function getOrgProfile(): Promise<OrgProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profile`, { cache: "no-store" });
  return parseOrgProfileResponse(response, "loaded");
}

export async function updateOrgProfile(profile: OrgProfile): Promise<OrgProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffCount: profile.staffCount,
      adminCapacity: profile.administrativeCapacity,
      themes: profile.themes.map((tag) => tag.value),
      targetGroups: profile.targetGroups.map((tag) => tag.value),
    }),
  });

  return parseOrgProfileResponse(response, "saved");
}

function isFundingCallDetail(value: unknown): value is FundingCallDetailDto {
  if (!value || typeof value !== "object") {
    return false;
  }

  const call = value as Record<string, unknown>;
  const rounds = call.rounds;
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
      (call.score === null || typeof call.score === "number") &&
    (call.budgetMin === null || typeof call.budgetMin === "number") &&
    (call.budgetMax === null || typeof call.budgetMax === "number") &&
    typeof call.currency === "string" &&
    typeof call.updatedAt === "string" &&
    (call.description === null || typeof call.description === "string") &&
    (call.eligibility === null || typeof call.eligibility === "string") &&
    (call.ngoEligible === null || typeof call.ngoEligible === "boolean") &&
    (call.funderType === null || typeof call.funderType === "string") &&
    Array.isArray(call.themes) && call.themes.every((theme) => typeof theme === "string") &&
    Array.isArray(call.targetGroups) && call.targetGroups.every((group) => typeof group === "string") &&
    (call.sourceUrl === null || typeof call.sourceUrl === "string") &&
    (call.externalId === null || typeof call.externalId === "string") &&
    (call.lastChecked === null || typeof call.lastChecked === "string") &&
    typeof call.createdAt === "string" &&
    Array.isArray(rounds) &&
    rounds.every((round) => {
      if (!round || typeof round !== "object") {
        return false;
      }
      const item = round as Record<string, unknown>;
      return (
        (item.roundNo === null || typeof item.roundNo === "number") &&
        (item.openDate === null || typeof item.openDate === "string") &&
        (item.deadlineDate === null || typeof item.deadlineDate === "string") &&
        (item.decisionDate === null || typeof item.decisionDate === "string") &&
        (item.expectedNextOpenDate === null || typeof item.expectedNextOpenDate === "string")
      );
    })
  );
}

function toOptionalText(value: string | null) {
  return value?.trim() || undefined;
}

function mapFundingCallDetails(call: FundingCallDetailDto): FundingCallDetails {
  const fundingRounds = call.rounds.map((round, index) => ({
    id: `${call.id}-round-${round.roundNo ?? index + 1}`,
    title: round.roundNo === null ? "Funding round" : `Round ${round.roundNo}`,
    openDate: round.openDate ?? undefined,
    deadline: round.deadlineDate ?? undefined,
    decisionDate: round.decisionDate ?? undefined,
    expectedNextOpenDate: round.expectedNextOpenDate ?? undefined,
  }));
  const now = Date.now();
  const expectedReopeningDate = fundingRounds
    .map((round) => round.expectedNextOpenDate)
    .filter((date): date is string => !!date && new Date(date).getTime() >= now)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

  return {
    id: String(call.id),
    title: call.title,
    summary: toOptionalText(call.summary) ?? "—",
    description: toOptionalText(call.description) ?? "—",
    fundingBody: toOptionalText(call.fundingBody) ?? "—",
    fundingLevel: call.level ?? "—",
    funderType: toOptionalText(call.funderType),
    amountMin: call.budgetMin ?? undefined,
    amountMax: call.budgetMax ?? undefined,
    currency: call.currency,
    score: call.score ?? undefined,
    eligibility: toOptionalText(call.eligibility) ?? "—",
    ngoEligible: call.ngoEligible,
    status: mapCallStatus(call.status),
    recurringCall: call.recurring,
    expectedReopeningDate,
    sourceUrl: toOptionalText(call.sourceUrl),
    themes: call.themes.map((theme, index) => ({
      id: `${call.id}-theme-${index}`,
      value: theme,
      type: "Theme",
    })),
    targetGroups: call.targetGroups.map((group, index) => ({
      id: `${call.id}-group-${index}`,
      value: group,
      type: "TargetGroup",
    })),
    fundingRounds,
  };
}

export async function getFundingCallById(id: string): Promise<FundingCallDetails> {
  return mapFundingCallDetails(await getFundingCallDto(id));
}

export async function getFundingCallDto(id: string): Promise<FundingCallDetailDto> {
  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    throw new ApiRequestError("Funding opportunity was not found", 404);
  }

  const response = await fetch(`${apiBaseUrl}/api/calls/${id}`, { cache: "no-store" });
  if (response.status === 404) {
    throw new ApiRequestError("Funding opportunity was not found", 404);
  }
  if (!response.ok) {
    throw new ApiRequestError("Funding opportunity could not be loaded", response.status);
  }

  const payload: unknown = await response.json();
  if (!isFundingCallDetail(payload)) {
    throw new ApiRequestError("Funding opportunity returned an unexpected response", 502);
  }

  return payload;
}

async function sendFundingCall(path: string, method: string, body?: FundingCallBodyDto) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: body && { "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details: { path: string; message: string }[] = payload?.error?.details ?? [];
    const message = details.length
      ? details.map((detail) => `${detail.path}: ${detail.message}`).join("; ")
      : payload?.error?.message ?? `Funding call request failed (${response.status})`;
    throw new ApiRequestError(message, response.status);
  }

  return payload;
}

export async function createFundingCall(body: FundingCallBodyDto): Promise<{ id: string }> {
  const created = await sendFundingCall("/api/calls", "POST", body);
  return { id: String(created.id) };
}

export async function updateFundingCall(id: string, body: FundingCallBodyDto): Promise<void> {
  await sendFundingCall(`/api/calls/${id}`, "PATCH", body);
}

export async function deleteFundingCall(id: string): Promise<void> {
  await sendFundingCall(`/api/calls/${id}`, "DELETE");
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
