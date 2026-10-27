"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal, PageHeader } from "@/components/common";
import {
  FundingOpportunityForm,
  toFundingCallBody,
  type FundingOpportunityFormValues,
} from "@/components/funding-opportunity-form";
import { deleteFundingCall, updateFundingCall } from "@/lib/services";
import type { CallStatus, FundingCallDetailDto } from "@/lib/types";

export default function OpportunityEditClient({ call }: { call: FundingCallDetailDto }) {
  const router = useRouter();
  const id = String(call.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

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
    themes: call.themes.join(", "),
    targetGroups: call.targetGroups.join(", "),
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
    await updateFundingCall(id, {
      ...toFundingCallBody(values),
      // A checkbox has no "not stated": left unticked, a scraped call keeps its null.
      ngoEligible: values.ngoEligible || (call.ngoEligible === null ? null : false),
    });
    router.push(`/opportunities/${id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteFundingCall(id);
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deleting failed.");
      setDeleteOpen(false);
    }
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

      {deleteError && (
        <p role="alert" className="mb-6 rounded-[20px] border border-red-200 bg-red-50 px-4.5 py-3 text-[14px] font-bold text-red-600">
          {deleteError}
        </p>
      )}

      <FundingOpportunityForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/opportunities/${id}`)}
        submitLabel="Save Changes"
        pendingLabel="Saving…"
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
