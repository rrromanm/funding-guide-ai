"use client";

import { useState } from "react";
import { EditableTagGroup } from "@/components/profile-form";
import type { ApiCallStatus, CallStatus, FundingCallBodyDto, FundingRound, Tag, TagType } from "@/lib/types";

const MIN_DESCRIPTION_CHARS = 500;
const LEVELS = [
  ["local", "Local"],
  ["municipal", "Municipal"],
  ["regional", "Regional"],
  ["national", "National"],
  ["nordic", "Nordic"],
  ["eu", "EU"],
];
const FUNDER_TYPES = [
  ["public_pool", "Public pool"],
  ["foundation", "Foundation"],
  ["eu_programme", "EU programme"],
  ["other", "Other"],
];

export interface FundingOpportunityFormValues {
  id?: string;
  title: string;
  summary: string;
  description: string;
  fundingBody: string;
  fundingLevel: string;
  funderType: string;
  sourceUrl: string;
  amountMin: string;
  amountMax: string;
  eligibility: string;
  ngoEligible: boolean;
  status: CallStatus;
  recurringCall: boolean;
  themes: string[];
  targetGroups: string[];
  fundingRounds: FundingRound[];
}

const toTags = (values: string[], type: TagType): Tag[] => values.map((value) => ({ id: value, value, type }));

// Empty fields go out as "" / null rather than being left out, so an edit clears them.
export function toFundingCallBody(values: FundingOpportunityFormValues): FundingCallBodyDto {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    summary: values.summary.trim(),
    eligibility: values.eligibility.trim(),
    fundingBody: values.fundingBody.trim(),
    sourceUrl: values.sourceUrl.trim() || null,
    level: values.fundingLevel || null,
    funderType: values.funderType || null,
    status: values.status.toLowerCase() as ApiCallStatus,
    recurring: values.recurringCall,
    ngoEligible: values.ngoEligible,
    budgetMin: values.amountMin ? Number(values.amountMin) : null,
    budgetMax: values.amountMax ? Number(values.amountMax) : null,
    rounds: values.fundingRounds
      .filter((round) => round.openDate || round.deadline || round.decisionDate || round.expectedNextOpenDate)
      .map((round) => ({
        openDate: round.openDate || null,
        deadlineDate: round.deadline || null,
        decisionDate: round.decisionDate || null,
        expectedNextOpenDate: round.expectedNextOpenDate || null,
      })),
    themes: values.themes,
    targetGroups: values.targetGroups,
  };
}

export function FundingOpportunityForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel = "Saving and scoring…",
}: {
  initialValues: FundingOpportunityFormValues;
  onSubmit: (values: FundingOpportunityFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [formValues, setFormValues] = useState<FundingOpportunityFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const updateField = <K extends keyof FundingOpportunityFormValues>(key: K, value: FundingOpportunityFormValues[K]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  const updateRound = (index: number, key: keyof FundingRound, value: string) => {
    setFormValues((current) => ({
      ...current,
      fundingRounds: current.fundingRounds.map((round, roundIndex) =>
        roundIndex === index ? { ...round, [key]: value } : round,
      ),
    }));
  };

  const addRound = () => {
    setFormValues((current) => ({
      ...current,
      fundingRounds: [
        ...current.fundingRounds,
        {
          id: `round-${Date.now()}`,
          title: "Additional round",
          openDate: "",
          deadline: "",
          decisionDate: "",
          expectedNextOpenDate: "",
        },
      ],
    }));
  };

  const deleteRound = (index: number) => {
    setFormValues((current) => ({
      ...current,
      fundingRounds: current.fundingRounds.filter((_, roundIndex) => roundIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      await onSubmit(formValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="opportunity-title" className="field-label">Title</label>
          <input
            id="opportunity-title"
            required
            value={formValues.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="opportunity-summary" className="field-label">Summary</label>
          <textarea
            id="opportunity-summary"
            value={formValues.summary}
            onChange={(event) => updateField("summary", event.target.value)}
            rows={3}
            className="input min-h-[110px] rounded-[24px]"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="opportunity-description" className="field-label">Description</label>
          <textarea
            id="opportunity-description"
            required
            minLength={MIN_DESCRIPTION_CHARS}
            aria-describedby="opportunity-description-hint"
            value={formValues.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={8}
            className="input min-h-[200px] rounded-[24px]"
          />
          <p id="opportunity-description-hint" className="mt-1 text-[14px] text-muted">
            The AI scores the call from this text, so paste the full call: purpose, who can apply, what is
            funded and how to apply. {MIN_DESCRIPTION_CHARS} characters
            minimum.
          </p>
        </div>

        <div>
          <label htmlFor="funding-body" className="field-label">Funder</label>
          <input
            id="funding-body"
            aria-describedby="funding-body-hint"
            value={formValues.fundingBody}
            onChange={(event) => updateField("fundingBody", event.target.value)}
            className="input"
          />
          <p id="funding-body-hint" className="mt-1 text-[14px] text-muted">
            The organisation that gives the money, e.g. Statens Kunstfond, not the website the call was found on.
          </p>
        </div>

        <div>
          <label htmlFor="funding-level" className="field-label">Funding Level</label>
          <select
            id="funding-level"
            value={formValues.fundingLevel}
            onChange={(event) => updateField("fundingLevel", event.target.value)}
            className="input"
          >
            <option value="">Not stated</option>
            {LEVELS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="funder-type" className="field-label">Funder Type</label>
          <select
            id="funder-type"
            value={formValues.funderType}
            onChange={(event) => updateField("funderType", event.target.value)}
            className="input"
          >
            <option value="">Not stated</option>
            {FUNDER_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="source-url" className="field-label">Source URL</label>
          <input
            id="source-url"
            type="url"
            value={formValues.sourceUrl}
            onChange={(event) => updateField("sourceUrl", event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="minimum-budget" className="field-label">Minimum Budget</label>
          <input
            id="minimum-budget"
            type="number"
            min={0}
            value={formValues.amountMin}
            onChange={(event) => updateField("amountMin", event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="maximum-budget" className="field-label">Maximum Budget</label>
          <input
            id="maximum-budget"
            type="number"
            min={0}
            value={formValues.amountMax}
            onChange={(event) => updateField("amountMax", event.target.value)}
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="eligibility-requirements" className="field-label">Eligibility Requirements</label>
          <textarea
            id="eligibility-requirements"
            value={formValues.eligibility}
            onChange={(event) => updateField("eligibility", event.target.value)}
            rows={4}
            className="input min-h-[110px] rounded-[24px]"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="ngo-eligible"
            type="checkbox"
            checked={formValues.ngoEligible}
            onChange={(event) => updateField("ngoEligible", event.target.checked)}
            className="size-5 rounded border-hairline"
          />
          <label htmlFor="ngo-eligible" className="text-[15px] text-ink-600">
            NGO eligible
          </label>
        </div>

        <div>
          <label htmlFor="opportunity-status" className="field-label">Status</label>
          <select
            id="opportunity-status"
            value={formValues.status}
            onChange={(event) => updateField("status", event.target.value as CallStatus)}
            className="input"
          >
            <option value="OPEN">Open</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="CLOSED">Closed</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-5">
          <input
            id="recurring-call"
            type="checkbox"
            checked={formValues.recurringCall}
            onChange={(event) => updateField("recurringCall", event.target.checked)}
            className="size-5 rounded border-hairline"
          />
          <label htmlFor="recurring-call" className="text-[15px] text-ink-600">
            Recurring call
          </label>
        </div>

        <div className="space-y-4 md:col-span-2">
          <EditableTagGroup
            label="Themes"
            helperText="What the call funds. The matcher compares these with PYN's themes."
            placeholder="Add a theme, e.g. Youth"
            tags={toTags(formValues.themes, "Theme")}
            type="Theme"
            onChange={(tags) => updateField("themes", tags.map((tag) => tag.value))}
          />
          <EditableTagGroup
            label="Target groups"
            helperText="Who the call is meant to reach."
            placeholder="Add a target group, e.g. Young people"
            tags={toTags(formValues.targetGroups, "TargetGroup")}
            type="TargetGroup"
            onChange={(tags) => updateField("targetGroups", tags.map((tag) => tag.value))}
          />
        </div>
      </div>

      <div className="rounded-[20px] border border-hairline bg-canvas p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[22px] font-bold tracking-[-.03em] text-ink-900">Funding rounds</h3>
            <p className="text-[14px] text-muted">Add one or more deadline rounds where relevant.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={addRound}>
            Add another round
          </button>
        </div>

        <div className="space-y-4">
          {formValues.fundingRounds.length === 0 ? (
            <p className="text-[14px] text-muted">No rounds added yet.</p>
          ) : (
            formValues.fundingRounds.map((round, index) => (
              <div key={round.id} className="rounded-[20px] border border-hairline bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-bold text-ink-900">Round {index + 1}</span>
                  <button
                    type="button"
                    className="btn btn-tertiary"
                    onClick={() => deleteRound(index)}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor={`${round.id}-open-date`} className="field-label">Open date</label>
                    <input
                      id={`${round.id}-open-date`}
                      type="date"
                      value={round.openDate ?? ""}
                      onChange={(event) => updateRound(index, "openDate", event.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${round.id}-deadline`} className="field-label">Deadline date</label>
                    <input
                      id={`${round.id}-deadline`}
                      type="date"
                      value={round.deadline ?? ""}
                      onChange={(event) => updateRound(index, "deadline", event.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor={`${round.id}-decision-date`} className="field-label">Decision date</label>
                    <input
                      id={`${round.id}-decision-date`}
                      type="date"
                      value={round.decisionDate ?? ""}
                      onChange={(event) => updateRound(index, "decisionDate", event.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor={`${round.id}-next-open-date`} className="field-label">Expected next open date</label>
                    <input
                      id={`${round.id}-next-open-date`}
                      type="date"
                      value={round.expectedNextOpenDate ?? ""}
                      onChange={(event) => updateRound(index, "expectedNextOpenDate", event.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-[20px] border border-red-200 bg-red-50 px-4.5 py-3 text-[14px] font-bold text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
