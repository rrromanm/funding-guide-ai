"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal, PageHeader } from "@/components/common";
import { FundingOpportunityForm, type FundingOpportunityFormValues } from "@/components/funding-opportunity-form";
import { deleteFundingCall, updateFundingCall } from "@/lib/services";
import type { FundingCall } from "@/lib/types";

export default function OpportunityEditClient({ opportunity }: { opportunity: FundingCall }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const initialValues: FundingOpportunityFormValues = {
    id: opportunity.id,
    title: opportunity.title,
    summary: opportunity.summary,
    description: opportunity.description,
    fundingBody: opportunity.fundingBody,
    fundingLevel: opportunity.fundingLevel,
    funderType: opportunity.funderType ?? "",
    sourceUrl: opportunity.sourceUrl ?? "",
    amountMin: opportunity.amountMin?.toString() ?? "",
    amountMax: opportunity.amountMax?.toString() ?? "",
    eligibility: opportunity.eligibility,
    ngoEligible: opportunity.ngoEligible ?? false,
    status: opportunity.status,
    recurringCall: opportunity.recurringCall ?? false,
    expectedReopeningDate: opportunity.expectedReopeningDate ?? "",
    themes: opportunity.themes.map((tag) => tag.value).join(", "),
    targetGroups: opportunity.targetGroups.map((tag) => tag.value).join(", "),
    fundingRounds: opportunity.fundingRounds,
  };

  const handleSubmit = (values: FundingOpportunityFormValues) => {
    const updated: Partial<FundingCall> = {
      title: values.title,
      summary: values.summary,
      description: values.description,
      fundingBody: values.fundingBody,
      fundingLevel: values.fundingLevel,
      funderType: values.funderType,
      amountMin: values.amountMin ? Number(values.amountMin) : undefined,
      amountMax: values.amountMax ? Number(values.amountMax) : undefined,
      eligibility: values.eligibility,
      ngoEligible: values.ngoEligible,
      status: values.status,
      recurringCall: values.recurringCall,
      expectedReopeningDate: values.expectedReopeningDate || undefined,
      sourceUrl: values.sourceUrl || undefined,
      themes: values.themes
        .split(",")
        .map((tag, index) => ({ id: `theme-${index}-${tag.trim()}`, value: tag.trim(), type: "Theme" as const }))
        .filter((tag) => tag.value),
      targetGroups: values.targetGroups
        .split(",")
        .map((tag, index) => ({ id: `group-${index}-${tag.trim()}`, value: tag.trim(), type: "TargetGroup" as const }))
        .filter((tag) => tag.value),
      fundingRounds: values.fundingRounds,
    };

    const result = updateFundingCall(opportunity.id, updated);
    if (result) {
      router.push(`/opportunities/${opportunity.id}`);
    }
  };

  const handleDelete = () => {
    const removed = deleteFundingCall(opportunity.id);
    if (removed) {
      router.push("/");
    }
    setDeleteOpen(false);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Edit Funding Opportunity"
        subtitle="Update the stored call details and keep the record aligned with the latest organisational context."
        action={
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(true)}>
            Delete Opportunity
          </button>
        }
      />

      <FundingOpportunityForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/opportunities/${opportunity.id}`)}
        submitLabel="Save Changes"
      />

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
