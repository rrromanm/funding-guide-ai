"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common";
import { FundingOpportunityForm, type FundingOpportunityFormValues } from "@/components/funding-opportunity-form";
import { createFundingCall } from "@/lib/services";
import type { FundingCall } from "@/lib/types";

const defaultValues: FundingOpportunityFormValues = {
  title: "",
  summary: "",
  description: "",
  fundingBody: "",
  fundingLevel: "",
  funderType: "",
  sourceUrl: "",
  amountMin: "",
  amountMax: "",
  eligibility: "",
  ngoEligible: true,
  status: "OPEN",
  recurringCall: false,
  expectedReopeningDate: "",
  themes: "",
  targetGroups: "",
  fundingRounds: [
    {
      id: "round-new-1",
      title: "Primary round",
      openDate: "",
      deadline: "",
      decisionDate: "",
      expectedNextOpenDate: "",
    },
  ],
};

export default function NewOpportunityPage() {
  const router = useRouter();

  const handleSubmit = (values: FundingOpportunityFormValues) => {
    const nextCall: Omit<FundingCall, "id" | "matchResult"> & { id?: string } = {
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
      relevantRegions: ["Denmark"],
    };

    const created = createFundingCall(nextCall);
    router.push(`/opportunities/${created.id}`);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Add Funding Opportunity"
        subtitle="Create a manual entry for a funding call that should be reviewed by the PYN admin team."
        action={
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
            Back to dashboard
          </button>
        }
      />

      <FundingOpportunityForm
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/")}
        submitLabel="Save Opportunity"
      />
    </div>
  );
}
