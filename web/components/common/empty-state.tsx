import type { ReactNode } from "react";

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
