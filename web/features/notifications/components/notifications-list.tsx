"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getNotifications, updateNotificationRead } from "@/features/notifications/api";
import type { Notification } from "@/lib/types";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function NotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setNotifications(await getNotifications());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Notifications could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const setReadState = async (id: number, read: boolean) => {
    setBusyIds((current) => [...current, id]);
    setItemErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      const updated = await updateNotificationRead(id, read);
      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, read: updated.read } : item,
        ),
      );
    } catch (requestError) {
      setItemErrors((current) => ({
        ...current,
        [id]:
          requestError instanceof Error
            ? requestError.message
            : "Notification could not be updated.",
      }));
      throw requestError;
    } finally {
      setBusyIds((current) => current.filter((busyId) => busyId !== id));
    }
  };

  const handleView = async (
    event: MouseEvent<HTMLAnchorElement>,
    notification: Notification,
  ) => {
    if (notification.read) return;
    event.preventDefault();
    const href = event.currentTarget.href;
    try {
      await setReadState(notification.id, true);
      router.push(href);
    } catch {
      // The visible item error explains why navigation did not proceed.
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="p-5 sm:p-8">
      <PageHeader
        title="Notifications"
        subtitle={
          loading
            ? "Loading notifications…"
            : unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "No unread updates"
        }
      />

      {loading ? (
        <div
          className="card space-y-4"
          role="status"
          aria-label="Loading notifications"
        >
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-[12px] bg-violet-50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="card flex flex-col items-start gap-4">
          <div>
            <h2 className="font-display text-[21px] font-bold text-ink-900">
              Notifications could not be loaded.
            </h2>
            <p className="mt-2 text-[15px] text-ink-600" role="alert">
              {error}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void loadNotifications()}
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet."
          description="New funding opportunities will appear here."
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              aria-label={`Notification: ${notification.message}`}
              className={`card flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${notification.read ? "opacity-80" : ""}`}
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className={`mt-1 size-3 shrink-0 rounded-full ${notification.read ? "bg-hairline" : "bg-violet-600"}`} />
                <div className="min-w-0">
                  <p className="break-words font-bold text-ink-900">{notification.message}</p>
                  <p className="mt-2 text-[13px] text-muted">{formatDate(notification.createdAt)}</p>
                  <ul className="mt-3 space-y-2">
                    {notification.fundingOpportunities.map((call) => (
                      <li key={call.id}>
                        <Link
                          href={`/opportunities/${call.id}`}
                          className="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                          aria-label={`View funding opportunity: ${call.title}`}
                          onClick={(event) => void handleView(event, notification)}
                        >
                          {call.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {notification.fundingOpportunities.length === 0 && (
                    <p className="mt-3 text-[14px] text-muted">
                      No associated opportunities are available.
                    </p>
                  )}
                  {itemErrors[notification.id] && (
                    <p className="mt-3 text-[14px] font-semibold text-red-600" role="alert">
                      {itemErrors[notification.id]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {!notification.read && (
                  <span className="chip chip-possible">Unread</span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary max-sm:px-4 max-sm:text-[14px]"
                  disabled={busyIds.includes(notification.id)}
                  onClick={() =>
                    void setReadState(notification.id, !notification.read).catch(
                      () => undefined,
                    )
                  }
                >
                  {busyIds.includes(notification.id)
                    ? "Saving…"
                    : notification.read
                      ? "Mark as unread"
                      : "Mark as read"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
