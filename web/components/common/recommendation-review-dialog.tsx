"use client";

import { useState, type FormEvent } from "react";
import type { FundingCallReviewBody } from "@/lib/types";

export type RecommendationReviewMode = "override" | "dismiss";

export function RecommendationReviewDialog({
  mode,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  mode: RecommendationReviewMode;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (body: FundingCallReviewBody) => void;
}) {
  const [manualScore, setManualScore] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [validationError, setValidationError] = useState("");
  const isOverride = mode === "override";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    const parsedScore = Number(manualScore);
    if (isOverride && (!manualScore.trim() || !Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      setValidationError("Enter a whole-number score from 0 to 100.");
      return;
    }
    if (adminNote.trim().length > 2000) {
      setValidationError("The administrator note must be 2,000 characters or fewer.");
      return;
    }

    onSubmit({
      reviewStatus: isOverride ? "overridden" : "dismissed",
      ...(isOverride ? { manualScore: parsedScore } : {}),
      ...(adminNote.trim() ? { adminNote: adminNote.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-review-title"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6 shadow-card"
      >
        <h2 id="recommendation-review-title" className="font-display text-[24px] font-bold text-ink-900">
          {isOverride ? "Override recommendation" : "Dismiss recommendation"}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          {isOverride
            ? "Set the score that should be used for this opportunity."
            : "This opportunity will be hidden from the funding opportunities list until restored."}
        </p>

        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          {isOverride && (
            <div>
              <label htmlFor="manual-score" className="field-label">Manual score</label>
              <input
                id="manual-score"
                aria-describedby={validationError ? "review-validation-error" : undefined}
                className="input"
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                required
                value={manualScore}
                onChange={(event) => setManualScore(event.target.value)}
              />
            </div>
          )}
          <div>
            <label htmlFor="admin-note" className="field-label">Administrator note (optional)</label>
            <textarea
              id="admin-note"
              className="input min-h-24 resize-y"
              maxLength={2000}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
            />
          </div>

          {(validationError || error) && (
            <p id="review-validation-error" role="alert" className="text-[14px] font-semibold text-red-600">
              {validationError || error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isOverride ? "btn-primary" : "btn-danger-outline"}`}
              disabled={busy}
            >
              {busy ? "Saving…" : isOverride ? "Save override" : "Dismiss opportunity"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}