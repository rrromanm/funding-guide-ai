import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { SourceListResponse } from "@/lib/types";

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

export async function getFundingSources(): Promise<SourceListResponse> {
  const response = await apiFetch("/api/sources", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Source endpoint returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isSourceListResponse(payload)) {
    throw new Error("Source endpoint returned an unexpected response");
  }

  return payload;
}

export async function checkAllSources(): Promise<void> {
  const response = await apiFetch("/api/sources/check", { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiRequestError(payload?.error?.message ?? `Source check failed (${response.status})`, response.status);
  }
}
