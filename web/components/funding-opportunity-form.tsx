"use client";

import { useState } from "react";
import type { CallStatus, FundingRound } from "@/lib/types";

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
  expectedReopeningDate: string;
  themes: string;
  targetGroups: string;
  fundingRounds: FundingRound[];
}

export function FundingOpportunityForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialValues: FundingOpportunityFormValues;
  onSubmit: (values: FundingOpportunityFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [formValues, setFormValues] = useState<FundingOpportunityFormValues>(initialValues);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValues);
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
            required
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
            value={formValues.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={5}
            className="input min-h-[140px] rounded-[24px]"
          />
        </div>

        <div>
          <label htmlFor="funding-body" className="field-label">Funding Body</label>
          <input
            id="funding-body"
            required
            value={formValues.fundingBody}
            onChange={(event) => updateField("fundingBody", event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="funding-level" className="field-label">Funding Level</label>
          <input
            id="funding-level"
            required
            value={formValues.fundingLevel}
            onChange={(event) => updateField("fundingLevel", event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="funder-type" className="field-label">Funder Type</label>
          <input
            id="funder-type"
            value={formValues.funderType}
            onChange={(event) => updateField("funderType", event.target.value)}
            className="input"
          />
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
            value={formValues.amountMax}
            onChange={(event) => updateField("amountMax", event.target.value)}
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="eligibility-requirements" className="field-label">Eligibility Requirements</label>
          <textarea
            id="eligibility-requirements"
            required
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

        <div>
          <label htmlFor="expected-reopening-date" className="field-label">Expected reopening date</label>
          <input
            id="expected-reopening-date"
            type="date"
            value={formValues.expectedReopeningDate}
            onChange={(event) => updateField("expectedReopeningDate", event.target.value)}
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="opportunity-themes" className="field-label">Themes / Tags</label>
          <input
            id="opportunity-themes"
            value={formValues.themes}
            onChange={(event) => updateField("themes", event.target.value)}
            placeholder="e.g. Youth, Climate, Civic engagement"
            className="input"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="opportunity-target-groups" className="field-label">Target Groups / Tags</label>
          <input
            id="opportunity-target-groups"
            value={formValues.targetGroups}
            onChange={(event) => updateField("targetGroups", event.target.value)}
            placeholder="e.g. Young people, Youth NGOs"
            className="input"
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
                    <label htmlFor={`${round.id}-title`} className="field-label">Label</label>
                    <input
                      id={`${round.id}-title`}
                      value={round.title}
                      onChange={(event) => updateRound(index, "title", event.target.value)}
                      className="input"
                    />
                  </div>

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

      <div className="flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
