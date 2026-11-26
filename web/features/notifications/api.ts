import { apiFetch, ApiRequestError } from "@/lib/api/client";
import type { Notification, NotificationDetailDto, NotificationItemDto, NotificationListResponseDto } from "@/lib/types";

function isNotificationItem(value: unknown): value is NotificationItemDto {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    typeof item.message === "string" &&
    typeof item.read === "boolean" &&
    typeof item.createdAt === "string"
  );
}

function isNotificationList(value: unknown): value is NotificationListResponseDto {
  return (
    !!value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(isNotificationItem)
  );
}

function isNotificationDetail(value: unknown): value is NotificationDetailDto {
  if (!isNotificationItem(value) || !("fundingOpportunities" in value)) return false;
  const opportunities = (value as Record<string, unknown>).fundingOpportunities;
  return (
    Array.isArray(opportunities) &&
    opportunities.every(
      (call) =>
        !!call &&
        typeof call === "object" &&
        typeof (call as Record<string, unknown>).id === "number" &&
        typeof (call as Record<string, unknown>).title === "string",
    )
  );
}

async function readNotificationResponse<T>(
  response: Response,
  action: string,
  isExpected: (value: unknown) => value is T,
): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: unknown; details?: unknown } }).error
        : undefined;
    const details = Array.isArray(error?.details)
      ? (error.details as { path: string; message: string }[])
      : [];
    const message = details.length
      ? details.map((detail) => `${detail.path}: ${detail.message}`).join("; ")
      : typeof error?.message === "string"
        ? error.message
        : `${action} failed (${response.status})`;
    throw new ApiRequestError(message, response.status);
  }
  if (!isExpected(payload)) {
    throw new Error(`${action} returned an unexpected response`);
  }
  return payload;
}

let notificationsRequest: Promise<Notification[]> | undefined;

async function loadNotifications(): Promise<Notification[]> {
  const response = await apiFetch("/api/notifications", { cache: "no-store" });
  const { items } = await readNotificationResponse(
    response,
    "Loading notifications",
    isNotificationList,
  );

  return Promise.all(
    items.map(async ({ id }) => {
      const detailResponse = await apiFetch(`/api/notifications/${id}`, {
        cache: "no-store",
      });
      return readNotificationResponse(
        detailResponse,
        "Loading notification details",
        isNotificationDetail,
      );
    }),
  );
}

export function getNotifications(): Promise<Notification[]> {
  if (notificationsRequest) return notificationsRequest;

  const request = loadNotifications();
  notificationsRequest = request;
  void request.then(
    () => {
      if (notificationsRequest === request) notificationsRequest = undefined;
    },
    () => {
      if (notificationsRequest === request) notificationsRequest = undefined;
    },
  );
  return request;
}

export async function updateNotificationRead(
  id: number,
  read: boolean,
): Promise<NotificationItemDto> {
  const response = await apiFetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ read }),
  });
  return readNotificationResponse(
    response,
    "Updating notification",
    isNotificationItem,
  );
}
