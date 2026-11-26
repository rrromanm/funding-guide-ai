import { apiFetch, ApiRequestError } from "@/lib/api/client";
import { isFundingCallDetail, mapFundingCallDetails } from "@/features/opportunities/api";
import type { FundingCallDetails, FundingCallReviewBody } from "@/lib/types";

export async function reviewFundingCall(
  id: string,
  body: FundingCallReviewBody,
): Promise<FundingCallDetails> {
  if (
    (body.reviewStatus === "overridden") !== (body.manualScore !== undefined) ||
    (body.manualScore !== undefined &&
      (!Number.isInteger(body.manualScore) || body.manualScore < 0 || body.manualScore > 100)) ||
    (body.adminNote != null && body.adminNote.trim().length > 2000)
  ) {
    throw new ApiRequestError("Check the recommendation review details and try again.", 400);
  }

  const response = await apiFetch(`/api/calls/${id}/match`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      ...(body.adminNote !== undefined
        ? { adminNote: body.adminNote?.trim() || null }
        : {}),
    }),
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorValue =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: unknown }).error
        : undefined;
    const errorRecord =
      errorValue && typeof errorValue === "object"
        ? (errorValue as { details?: unknown; message?: unknown })
        : undefined;
    const details = Array.isArray(errorRecord?.details)
      ? (errorRecord.details as { path: string; message: string }[])
      : [];
    const message = details.length
      ? details.map((detail) => `${detail.path}: ${detail.message}`).join("; ")
      : typeof errorRecord?.message === "string"
        ? errorRecord.message
        : `Recommendation could not be updated (${response.status})`;
    throw new ApiRequestError(message, response.status);
  }

  if (!isFundingCallDetail(payload)) {
    throw new ApiRequestError("Recommendation review returned an unexpected response", 502);
  }

  return mapFundingCallDetails(payload);
}
