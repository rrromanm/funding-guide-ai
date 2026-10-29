"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/common/confirmation-modal";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { deleteFundingCall } from "@/lib/services";
import type { ApiConfidence, ApiFitLabel, FundingCallDetails, MatchReasonDto } from "@/lib/types";

const DESCRIPTION_PREVIEW_LENGTH = 900;
const CONFIDENCE_LABELS: Record<ApiConfidence, string> = { high: "High", medium: "Medium", low: "Low" };
const REASON_KINDS: Record<MatchReasonDto["kind"], { label: string; chip: string }> = {
  strength: { label: "Strength", chip: "chip-strong" },
  info: { label: "Info", chip: "chip-possible" },
  barrier: { label: "Barrier", chip: "chip-conditional" },
  blocker: { label: "Blocker", chip: "chip-closed" },
};
const REASON_ORDER: MatchReasonDto["kind"][] = ["blocker", "barrier", "strength", "info"];
const reasonTopic = (about: string | null) =>
  about ? about.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()) : null;
const FIT_LABELS: Record<ApiFitLabel, string> = {
  strong_fit: "Strong fit",
  possible_fit: "Possible fit",
  weak_fit: "Weak fit",
  not_recommended: "Not recommended",
};

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (value: number | undefined, currency: string) => {
  if (value === undefined || value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function FundingOpportunityDetail({ initialCall }: { initialCall: FundingCallDetails }) {
  const call = initialCall;
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const rounds = call.fundingRounds;
  const [roundIndex, setRoundIndex] = useState(0);
  const round = rounds[roundIndex];
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionIsLong = call.description.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription = descriptionExpanded || !descriptionIsLong
    ? call.description
    : `${call.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const handleDelete = async () => {
    try {
      await deleteFundingCall(String(call.id));
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deleting failed.");
      setDeleteOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-5 sm:px-8 sm:pb-8">
      <div ref={headerRef} className="flow-root bg-canvas pt-5 sm:pt-8 lg:sticky lg:top-0 lg:z-10 lg:-mx-8 lg:px-8">
        <PageHeader
          title={call.title}
          action={
            <div className="flex flex-wrap gap-3 md:max-w-1/2 md:shrink-0 md:self-start md:justify-end">
              <Link href="/" className="btn btn-secondary">
                Back to Funding Opportunities
              </Link>
              <Link href={`/opportunities/${call.id}/edit`} className="btn btn-primary">
                Edit Opportunity
              </Link>
              <button type="button" className="btn btn-destructive" onClick={() => setDeleteOpen(true)}>
                Delete Opportunity
              </button>
            </div>
          }
        />
        {deleteError && (
          <p role="alert" className="mb-6 rounded-[20px] border border-red-200 bg-red-50 px-4.5 py-3 text-[14px] font-bold text-red-600">
            {deleteError}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div className="space-y-6">
          <section className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Overview</p>
                <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">Funding opportunity</h2>
              </div>
              <StatusBadge status={call.status} />
            </div>
            <div className="max-w-[72ch]">
              <h3 className="field-label">Summary</h3>
              <p className="text-[17px] leading-8 text-ink-600">{call.summary}</p>
            </div>
          </section>

          <section className="card">
            <div className="mb-4">
              <p className="eyebrow mb-2">Description</p>
              <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">About this opportunity</h2>
            </div>
            <div className="max-w-[72ch]">
              <p className="whitespace-pre-line text-[16px] leading-8 text-ink-600">{visibleDescription}</p>
              {descriptionIsLong && (
                <button
                  type="button"
                  className="btn btn-tertiary mt-4 px-0 text-violet-600 hover:text-violet-800"
                  aria-expanded={descriptionExpanded}
                  onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                >
                  {descriptionExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <div className="mb-5">
              <p className="eyebrow mb-2">Opportunity information</p>
              <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">Key details</h2>
            </div>

            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <h3 className="field-label">Funder</h3>
                <p className="text-[15px] text-ink-600">{call.fundingBody}</p>
              </div>
              <div>
                <h3 className="field-label">Funding level</h3>
                <p className="text-[15px] text-ink-600">{call.fundingLevel}</p>
              </div>
              <div>
                <h3 className="field-label">Funding amount</h3>
                <p className="text-[15px] text-ink-600">
                  {formatAmount(call.amountMin, call.currency)} – {formatAmount(call.amountMax, call.currency)}
                </p>
              </div>
              <div>
                <h3 className="field-label">Funder type</h3>
                <p className="text-[15px] text-ink-600">{call.funderType ?? "—"}</p>
              </div>
              <div>
                <h3 className="field-label">NGO eligible</h3>
                <p className="text-[15px] text-ink-600">{call.ngoEligible === null ? "—" : call.ngoEligible ? "Yes" : "No"}</p>
              </div>
              <div>
                <h3 className="field-label">Recurrence</h3>
                <p className="text-[15px] text-ink-600">{call.recurringCall ? "Recurring call" : "Single call"}</p>
              </div>
              <div className="sm:col-span-2">
                <h3 className="field-label">Eligibility</h3>
                <p className="max-w-[72ch] whitespace-pre-line text-[15px] leading-7 text-ink-600">{call.eligibility}</p>
              </div>
              <div>
                <h3 className="field-label">Expected reopening</h3>
                <p className="text-[15px] text-ink-600">{call.expectedReopeningDate ? formatDate(call.expectedReopeningDate) : "—"}</p>
              </div>
              <div>
                <h3 className="field-label">Themes</h3>
                <div className="flex flex-wrap gap-2">
                  {call.themes.length > 0 ? call.themes.map((tag) => (
                    <span key={tag.id} className="chip-neutral">{tag.value}</span>
                  )) : <span className="text-[15px] text-ink-600">—</span>}
                </div>
              </div>
              <div>
                <h3 className="field-label">Target groups</h3>
                <div className="flex flex-wrap gap-2">
                  {call.targetGroups?.length ? call.targetGroups.map((tag) => (
                    <span key={tag.id} className="chip-neutral">{tag.value}</span>
                  )) : <span className="text-[15px] text-ink-600">—</span>}
                </div>
              </div>
              {call.sourceUrl && (
                <div className="sm:col-span-2 min-w-0">
                  <h3 className="field-label">Source URL</h3>
                  <a href={call.sourceUrl} target="_blank" rel="noreferrer" className="block max-w-full break-words text-[15px] text-violet-600 hover:text-violet-800">
                    {call.sourceUrl}
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ponytail: assumes the aside fits on screen; past that its bottom shows only at the end of the page. */}
        <aside className="space-y-6 lg:sticky lg:self-start" style={{ top: headerHeight }}>
          <div className="panel-gradient">
            <p className="font-mono text-[13px] uppercase tracking-[.16em] text-white/85">Match score</p>
            {call.score === undefined ? (
              <p className="mt-3 text-[15px] text-white/85">Not scored yet.</p>
            ) : (
              <>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-[56px] font-bold leading-none tracking-[-.04em]">{call.score}</span>
                  <span className="text-[17px] text-white/90">
                    / 100{call.fitLabel && ` · ${FIT_LABELS[call.fitLabel]}`}
                  </span>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: `${call.score}%` }} />
                </div>
              </>
            )}
          </div>

          {(call.confidence || call.blockingReason || call.reasons.length > 0) && (
            <div className="card">
              <p className="eyebrow mb-3">AI recommendation</p>
              {call.confidence && (
                <p className="text-[15px] text-ink-600">
                  <span className="font-bold text-ink-900">Confidence:</span> {CONFIDENCE_LABELS[call.confidence]}
                </p>
              )}
              {call.blockingReason && (
                <div role="alert" className="mt-3 rounded-[16px] border border-red-200 bg-red-50 p-3">
                  <div className="font-bold text-red-600">Not eligible</div>
                  <p className="mt-1 break-words text-[14px] leading-relaxed text-ink-600">{call.blockingReason}</p>
                </div>
              )}
              {call.reasons.length > 0 && (
                <ul className="mt-3 space-y-3">
                  {[...call.reasons]
                    .sort((left, right) => REASON_ORDER.indexOf(left.kind) - REASON_ORDER.indexOf(right.kind))
                    .map((reason, index) => (
                      <li key={`${reason.kind}-${index}`} className="rounded-[16px] border border-hairline bg-canvas p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`chip ${REASON_KINDS[reason.kind].chip}`}>{REASON_KINDS[reason.kind].label}</span>
                          {reasonTopic(reason.about) && (
                            <span className="font-mono text-[12px] text-muted">{reasonTopic(reason.about)}</span>
                          )}
                        </div>
                        <p className="break-words text-[14px] leading-relaxed text-ink-600">{reason.message}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="eyebrow">Key dates</p>
              {rounds.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary size-8 p-0 disabled:cursor-default disabled:opacity-40"
                    aria-label="Previous round"
                    disabled={roundIndex === 0}
                    onClick={() => setRoundIndex((index) => index - 1)}
                  >
                    ‹
                  </button>
                  <span className="font-mono text-[13px] text-muted" aria-live="polite">
                    {roundIndex + 1} / {rounds.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary size-8 p-0 disabled:cursor-default disabled:opacity-40"
                    aria-label="Next round"
                    disabled={roundIndex === rounds.length - 1}
                    onClick={() => setRoundIndex((index) => index + 1)}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <div className="text-[15px] text-ink-600">
              {round ? (
                <div className="rounded-[16px] border border-hairline bg-canvas p-3">
                  <div className="font-bold text-ink-900">{round.title}</div>
                  <div className="mt-2">Open: {formatDate(round.openDate)}</div>
                  <div>Deadline: {formatDate(round.deadline)}</div>
                  <div>Decision: {formatDate(round.decisionDate)}</div>
                  <div>Next open: {formatDate(round.expectedNextOpenDate)}</div>
                </div>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmationModal
        open={deleteOpen}
        title="Delete Funding Opportunity?"
        description="Are you sure you want to delete this funding opportunity? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
