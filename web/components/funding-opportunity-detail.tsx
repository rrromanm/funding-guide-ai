"use client";

import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/common";
import type { FundingCallDetails } from "@/lib/types";

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

  return (
    <div className="p-8">
      <PageHeader
        title={call.title}
        subtitle={call.summary}
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

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <section className="card">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Overview</p>
              <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">Funding opportunity</h2>
            </div>
            <StatusBadge status={call.status} />
          </div>

          <div className="space-y-5 text-[15px] leading-relaxed text-ink-600">
            <div>
              <h3 className="field-label">Summary</h3>
              <p>{call.summary}</p>
            </div>

            <div>
              <h3 className="field-label">Description</h3>
              <p>{call.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="field-label">Funding body</h3>
                <p>{call.fundingBody}</p>
              </div>
              <div>
                <h3 className="field-label">Funding level</h3>
                <p>{call.fundingLevel}</p>
              </div>
              <div>
                <h3 className="field-label">Funding amount</h3>
                <p>
                  {formatAmount(call.amountMin, call.currency)} – {formatAmount(call.amountMax, call.currency)}
                </p>
              </div>
              <div>
                <h3 className="field-label">Funder type</h3>
                <p>{call.funderType ?? "—"}</p>
              </div>
              <div>
                <h3 className="field-label">NGO eligible</h3>
                <p>{call.ngoEligible === null ? "—" : call.ngoEligible ? "Yes" : "No"}</p>
              </div>
            </div>

            <div>
              <h3 className="field-label">Eligibility</h3>
              <p>{call.eligibility}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="field-label">Recurrence</h3>
                <p>{call.recurringCall ? "Recurring call" : "Single call"}</p>
              </div>
              <div>
                <h3 className="field-label">Expected reopening</h3>
                <p>{call.expectedReopeningDate ? formatDate(call.expectedReopeningDate) : "—"}</p>
              </div>
            </div>

            <div>
              <h3 className="field-label">Themes</h3>
              <div className="flex flex-wrap gap-2">
                {call.themes.length > 0 ? call.themes.map((tag) => (
                  <span key={tag.id} className="chip-neutral">{tag.value}</span>
                )) : <span>—</span>}
              </div>
            </div>

            <div>
              <h3 className="field-label">Target groups</h3>
              <div className="flex flex-wrap gap-2">
                {call.targetGroups?.length ? call.targetGroups.map((tag) => (
                  <span key={tag.id} className="chip-neutral">{tag.value}</span>
                )) : <span>—</span>}
              </div>
            </div>

            {call.sourceUrl && (
              <div>
                <h3 className="field-label">Source URL</h3>
                <a href={call.sourceUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-800">
                  {call.sourceUrl}
                </a>
              </div>
            )}
          </div>
        </section>

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
