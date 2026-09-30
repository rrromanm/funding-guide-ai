"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/common";
import { getNotifications, markNotificationRead } from "@/lib/services";
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
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications());

  const handleView = (id: string) => {
    const next = markNotificationRead(id);
    if (next) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      );
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="p-8">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "No unread updates"}
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet."
          description="New relevant funding opportunities will appear here."
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className={`card flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${notification.read ? "opacity-80" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 size-3 rounded-full ${notification.read ? "bg-hairline" : "bg-violet-600"}`} />
                <div>
                  <div className="font-bold text-ink-900">{notification.title}</div>
                  <p className="mt-1 text-[15px] text-ink-600">{notification.message}</p>
                  <p className="mt-2 text-[13px] text-muted">{formatDate(notification.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!notification.read && (
                  <span className="chip chip-possible">Unread</span>
                )}
                <Link href={`/opportunities/${notification.fundingCallId}`} className="btn btn-secondary" onClick={() => handleView(notification.id)}>
                  View Opportunity
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
