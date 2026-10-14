"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/common";
import type { FundingCallDetails } from "@/lib/types";

const DESCRIPTION_PREVIEW_LENGTH = 900;

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionIsLong = call.description.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription = descriptionExpanded || !descriptionIsLong
    ? call.description
    : `${call.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;

  return (
    <div className="mx-auto max-w-[1440px] p-5 sm:p-8">
      <PageHeader
        title={call.title}
        subtitle="Funding opportunity details"
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="btn btn-secondary">
              Back to Funding Opportunities
            </Link>
            <Link href={`/opportunities/${call.id}/edit`} className="btn btn-primary">
              Edit Opportunity
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
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
                <h3 className="field-label">Funding body</h3>
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

        <aside className="space-y-6">
          <div className="card">
            <p className="eyebrow mb-3">AI Recommendation</p>
            {call.score === undefined ? <p className="text-[15px] text-muted">Recommendation not available.</p> : <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-[28px] font-bold tracking-[-.04em] text-ink-900">
                    {call.score}/100
                  </div>
                  <div className="text-[14px] text-muted">Fit score</div>
                </div>
                {call.matchResult && <span className="chip chip-possible">{call.matchResult.fitLabel}</span>}
              </div>

              {call.matchResult && <p className="mb-4 text-[15px] text-ink-600">{call.matchResult.explanation}</p>}

              <div className="mb-4">
                <div className="meter">
                  <div className="meter-fill-violet" style={{ width: `${call.score}%` }} />
                </div>
              </div>

              <div className="space-y-3">
                {call.matchResult?.reasons.map((reason) => (
                  <div key={reason.id} className="rounded-[16px] border border-hairline bg-canvas p-3">
                    <div className="font-bold text-ink-900">{reason.title}</div>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{reason.description}</p>
                  </div>
                ))}
              </div>

            </>}
          </div>

          <div className="card">
            <p className="eyebrow mb-3">Key dates</p>
            <div className="space-y-3 text-[15px] text-ink-600">
              {call.fundingRounds.length > 0 ? (
                call.fundingRounds.map((round) => (
                  <div key={round.id} className="rounded-[16px] border border-hairline bg-canvas p-3">
                    <div className="font-bold text-ink-900">{round.title}</div>
                    <div className="mt-2">Open: {formatDate(round.openDate)}</div>
                    <div>Deadline: {formatDate(round.deadline)}</div>
                    <div>Decision: {formatDate(round.decisionDate)}</div>
                    <div>Next open: {formatDate(round.expectedNextOpenDate)}</div>
                  </div>
                ))
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
