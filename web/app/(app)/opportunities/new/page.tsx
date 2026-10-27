"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common";
import { FundingOpportunityForm, type FundingOpportunityFormValues } from "@/components/funding-opportunity-form";
import { createFundingCall } from "@/lib/services";
import type { ApiCallStatus } from "@/lib/types";

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

  const handleSubmit = async (values: FundingOpportunityFormValues) => {
    const text = (value: string) => value.trim() || undefined;
    const tags = (value: string) => value.split(",").map((tag) => tag.trim()).filter(Boolean);

    const created = await createFundingCall({
      title: values.title.trim(),
      description: values.description.trim(),
      summary: text(values.summary),
      eligibility: text(values.eligibility),
      fundingBody: text(values.fundingBody),
      sourceUrl: text(values.sourceUrl),
      level: text(values.fundingLevel),
      funderType: text(values.funderType),
      status: values.status.toLowerCase() as ApiCallStatus,
      recurring: values.recurringCall,
      ngoEligible: values.ngoEligible,
      budgetMin: values.amountMin ? Number(values.amountMin) : undefined,
      budgetMax: values.amountMax ? Number(values.amountMax) : undefined,
      rounds: values.fundingRounds
        .filter((round) => round.openDate || round.deadline || round.decisionDate || round.expectedNextOpenDate)
        .map((round) => ({
          openDate: round.openDate || null,
          deadlineDate: round.deadline || null,
          decisionDate: round.decisionDate || null,
          expectedNextOpenDate: round.expectedNextOpenDate || null,
        })),
      themes: tags(values.themes),
      targetGroups: tags(values.targetGroups),
    });
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
        submitLabel="Save and score"
      />
    </div>
  );
}
