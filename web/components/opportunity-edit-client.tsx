"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/common/confirmation-modal";
import { PageHeader } from "@/components/common/page-header";
import { ScoringModal } from "@/components/common/scoring-modal";
import {
  FundingOpportunityForm,
  toFundingCallBody,
  type FundingOpportunityFormValues,
} from "@/components/funding-opportunity-form";
import { rescoreFundingCall, updateFundingCall } from "@/lib/services";
import type { CallStatus, FundingCallDetailDto } from "@/lib/types";

export default function OpportunityEditClient({ call }: { call: FundingCallDetailDto }) {
  const router = useRouter();
  const id = String(call.id);
  const [rescoreOpen, setRescoreOpen] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string>();
  const showCall = () => router.push(`/opportunities/${id}`);

  const initialValues: FundingOpportunityFormValues = {
    id,
    title: call.title,
    summary: call.summary ?? "",
    description: call.description ?? "",
    fundingBody: call.fundingBody ?? "",
    fundingLevel: call.level ?? "",
    funderType: call.funderType ?? "",
    sourceUrl: call.sourceUrl ?? "",
    amountMin: call.budgetMin?.toString() ?? "",
    amountMax: call.budgetMax?.toString() ?? "",
    eligibility: call.eligibility ?? "",
    ngoEligible: call.ngoEligible ?? false,
    status: call.status.toUpperCase() as CallStatus,
    recurringCall: call.recurring,
    themes: call.themes,
    targetGroups: call.targetGroups,
    fundingRounds: call.rounds.map((round, index) => ({
      id: `round-${index}`,
      title: `Round ${index + 1}`,
      openDate: round.openDate ?? undefined,
      deadline: round.deadlineDate ?? undefined,
      decisionDate: round.decisionDate ?? undefined,
      expectedNextOpenDate: round.expectedNextOpenDate ?? undefined,
    })),
  };

  const handleSubmit = async (values: FundingOpportunityFormValues) => {
    const body = toFundingCallBody(values);
    await updateFundingCall(id, {
      ...body,
      description: values.description === initialValues.description ? undefined : body.description,
      ngoEligible: values.ngoEligible || (call.ngoEligible === null ? null : false),
    });
    setRescoreOpen(true);
  };

  const handleRescore = async () => {
    setRescoring(true);
    setRescoreError(undefined);
    try {
      await rescoreFundingCall(id);
      showCall();
    } catch (err) {
      setRescoreError(err instanceof Error ? err.message : "Rescoring failed.");
      setRescoring(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Edit Funding Opportunity"
        subtitle="Update the stored call details and keep the record aligned with the latest organisational context."
      />

      {rescoring && <ScoringModal />}

      <div inert={rescoring}>
        <FundingOpportunityForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={showCall}
          submitLabel="Save Changes"
          pendingLabel="Saving…"
        />
      </div>

      <ConfirmationModal
        open={rescoreOpen && !rescoring}
        title="Rescore with AI?"
        description={
          rescoreError
            ? `Rescoring failed: ${rescoreError}. Your changes are saved.`
            : "Your changes are saved. Should the AI rescore this call against the updated details? It can take up to half a minute."
        }
        confirmLabel={rescoreError ? "Try again" : "Rescore"}
        cancelLabel="Not now"
        onCancel={showCall}
        onConfirm={handleRescore}
      />
    </div>
  );
}
