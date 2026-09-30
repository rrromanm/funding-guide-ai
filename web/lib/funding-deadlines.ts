import type { CallStatus, FundingRound } from "./types";

const toTime = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
};

export function getDisplayedDeadline(
  rounds: FundingRound[],
  status: CallStatus,
  now = new Date(),
): string | undefined {
  const nowTime = now.getTime();
  const deadlines = rounds
    .map((round) => ({ value: round.deadline, time: toTime(round.deadline) }))
    .filter((item): item is { value: string; time: number } => item.time !== undefined)
    .sort((left, right) => left.time - right.time);

  if (status === "OPEN" || status === "UPCOMING") {
    const nextDeadline = deadlines.find((item) => item.time >= nowTime);
    if (nextDeadline) {
      return nextDeadline.value;
    }
  }

  const latestDeadline = deadlines.at(-1);
  if (latestDeadline) {
    return latestDeadline.value;
  }

  return rounds
    .map((round) => ({ value: round.expectedNextOpenDate, time: toTime(round.expectedNextOpenDate) }))
    .filter((item): item is { value: string; time: number } => item.time !== undefined)
    .sort((left, right) => left.time - right.time)
    .at(-1)?.value;
}
