import type { ReactNode } from "react";

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
    <div className="mb-6">
      <p className="eyebrow mb-2">Pangaea Youth Network</p>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[30px] font-bold tracking-[-.04em] text-ink-900">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-600">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
