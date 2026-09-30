import type { ReactNode } from "react";
import Link from "next/link";
import type { CallStatus } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow mb-2">Pangaea Youth Network</p>
        <h1 className="font-display text-[30px] font-bold tracking-[-.04em] text-ink-900">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[15px] text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: CallStatus }) {
  const styleMap: Record<CallStatus, string> = {
    OPEN: "chip chip-strong",
    UPCOMING: "chip chip-possible",
    CLOSED: "chip chip-closed",
    UNKNOWN: "chip chip-conditional",
  };

  const labelMap: Record<CallStatus, string> = {
    OPEN: "Open",
    UPCOMING: "Upcoming",
    CLOSED: "Closed",
    UNKNOWN: "Unknown",
  };

  return <span className={styleMap[status]}>{labelMap[status]}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="font-display text-[22px] font-bold text-ink-900">{title}</div>
      <p className="max-w-md text-[15px] leading-relaxed text-ink-600">{description}</p>
      {action}
    </div>
  );
}

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-card">
        <h2 className="font-display text-[24px] font-bold tracking-[-.04em] text-ink-900">{title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{description}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn ${confirmVariant === "destructive" ? "btn-destructive" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "tertiary" }) {
  const variantClass =
    variant === "secondary"
      ? "btn btn-secondary"
      : variant === "tertiary"
        ? "btn btn-tertiary"
        : "btn btn-primary";

  return (
    <Link href={href} className={variantClass}>
      {children}
    </Link>
  );
}
