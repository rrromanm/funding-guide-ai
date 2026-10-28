import type { CallStatus } from "@/lib/types";

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
