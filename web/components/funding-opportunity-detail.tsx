"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmationModal, PageHeader, StatusBadge } from "@/components/common";
import { dismissRecommendation, overrideRecommendation } from "@/lib/services";
import type { FitLabel, FundingCall } from "@/lib/types";

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

const formatAmount = (value?: number) => {
  if (value === undefined || value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function FundingOpportunityDetail({ initialCall }: { initialCall: FundingCall }) {
  const [call, setCall] = useState(initialCall);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [dismissConfirmOpen, setDismissConfirmOpen] = useState(false);
  const [selectedFitLabel, setSelectedFitLabel] = useState<FitLabel>(call.matchResult.fitLabel);
  const [manualScore, setManualScore] = useState(String(call.matchResult.manualScore ?? call.matchResult.overallScore));
  const [overrideReason, setOverrideReason] = useState("");

  const handleOverrideSave = () => {
    const parsedScore = manualScore.trim() ? Number(manualScore) : undefined;
    const updated = overrideRecommendation(
      call.id,
      selectedFitLabel,
      parsedScore !== undefined && Number.isFinite(parsedScore) ? parsedScore : undefined,
      overrideReason || undefined,
    );
    if (updated) {
      setCall(updated);
      setSelectedFitLabel(updated.matchResult.fitLabel);
      setManualScore(String(updated.matchResult.manualScore ?? updated.matchResult.overallScore));
    }
    setOverrideOpen(false);
    setOverrideReason("");
  };

  const handleDismiss = () => {
    const updated = dismissRecommendation(call.id);
    if (updated) {
      setCall(updated);
    }
    setDismissConfirmOpen(false);
  };

  const currentReviewStatus = call.matchResult.reviewStatus;

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
                  {formatAmount(call.amountMin)} – {formatAmount(call.amountMax)}
                </p>
              </div>
              <div>
                <h3 className="field-label">Funder type</h3>
                <p>{call.funderType ?? "—"}</p>
              </div>
              <div>
                <h3 className="field-label">NGO eligible</h3>
                <p>{call.ngoEligible ? "Yes" : "No"}</p>
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
                {call.themes.map((tag) => (
                  <span key={tag.id} className="chip-neutral">{tag.value}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="field-label">Target groups</h3>
              <div className="flex flex-wrap gap-2">
                {call.targetGroups.map((tag) => (
                  <span key={tag.id} className="chip-neutral">{tag.value}</span>
                ))}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[28px] font-bold tracking-[-.04em] text-ink-900">
                  {call.matchResult.overallScore}/100
                </div>
                <div className="text-[14px] text-muted">Fit score</div>
              </div>
              <span className="chip chip-possible">{call.matchResult.fitLabel}</span>
            </div>

            <p className="mb-4 text-[15px] text-ink-600">{call.matchResult.explanation}</p>

            <div className="mb-4">
              <div className="meter">
                <div className="meter-fill-violet" style={{ width: `${call.matchResult.overallScore}%` }} />
              </div>
            </div>

            <div className="space-y-3">
              {call.matchResult.reasons.map((reason) => (
                <div key={reason.id} className="rounded-[16px] border border-hairline bg-canvas p-3">
                  <div className="font-bold text-ink-900">{reason.title}</div>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{reason.description}</p>
                </div>
              ))}
            </div>

            {currentReviewStatus === "OVERRIDDEN" ? (
              <div className="mt-4 rounded-[16px] border border-violet-200 bg-violet-50 p-3 text-[14px] font-semibold text-violet-800">
                Recommendation manually overridden.
              </div>
            ) : null}

            {currentReviewStatus === "DISMISSED" ? (
              <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 p-3 text-[14px] font-semibold text-red-600">
                Recommendation dismissed.
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setOverrideOpen(true)}>
                Override recommendation
              </button>
              <button type="button" className="btn btn-tertiary text-red-600 hover:text-red-700" onClick={() => setDismissConfirmOpen(true)}>
                Dismiss recommendation
              </button>
            </div>
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

      <ConfirmationModal
        open={dismissConfirmOpen}
        title="Dismiss recommendation?"
        description="This will dismiss the current AI recommendation and keep the opportunity visible for review."
        confirmLabel="Dismiss"
        confirmVariant="destructive"
        onCancel={() => setDismissConfirmOpen(false)}
        onConfirm={handleDismiss}
      />

      {overrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-card">
            <h2 className="font-display text-[24px] font-bold tracking-[-.04em] text-ink-900">Override recommendation</h2>
            <p className="mt-2 text-[15px] text-ink-600">Current recommendation: {call.matchResult.fitLabel}</p>

            <div className="mt-5">
              <label htmlFor="override-fit-label" className="field-label">New recommendation</label>
              <select
                id="override-fit-label"
                value={selectedFitLabel}
                onChange={(event) => setSelectedFitLabel(event.target.value as FitLabel)}
                className="input"
              >
                <option value="Strong fit">Strong fit</option>
                <option value="Good fit">Good fit</option>
                <option value="Possible fit">Possible fit</option>
                <option value="Limited fit">Limited fit</option>
              </select>
            </div>

            <div className="mt-5">
              <label htmlFor="manual-fit-score" className="field-label">Manual fit score</label>
              <input
                id="manual-fit-score"
                type="number"
                min="0"
                max="100"
                value={manualScore}
                onChange={(event) => setManualScore(event.target.value)}
                className="input"
              />
            </div>

            <div className="mt-5">
              <label htmlFor="override-reason" className="field-label">Optional reason</label>
              <textarea
                id="override-reason"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={4}
                className="input min-h-[100px] rounded-[24px]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setOverrideOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleOverrideSave}>
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
