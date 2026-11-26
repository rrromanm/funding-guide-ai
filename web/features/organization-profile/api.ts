import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { OrgProfile, OrgProfileDto } from "@/lib/types";

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
    foundedYear: profile.foundedYear ?? undefined,
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
  const response = await apiFetch("/api/profile", { cache: "no-store" });
  return parseOrgProfileResponse(response, "loaded");
}

export async function updateOrgProfile(profile: OrgProfile): Promise<OrgProfile> {
  const response = await apiFetch("/api/profile", {
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
