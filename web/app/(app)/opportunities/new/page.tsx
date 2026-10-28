"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { ScoringModal } from "@/components/common/scoring-modal";
import { FundingOpportunityForm, toFundingCallBody, type FundingOpportunityFormValues } from "@/components/funding-opportunity-form";
import { createFundingCall } from "@/lib/services";

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
  themes: [],
  targetGroups: [],
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
  const [scoring, setScoring] = useState(false);

  const handleSubmit = async (values: FundingOpportunityFormValues) => {
    setScoring(true);
    try {
      const created = await createFundingCall(toFundingCallBody(values));
      router.push(`/opportunities/${created.id}`);
    } catch (err) {
      setScoring(false);
      throw err; // the form shows it
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Add Funding Opportunity"
        subtitle="Create a manual entry for a funding call that should be reviewed by the PYN admin team."
      />

      {scoring && <ScoringModal />}

      <div inert={scoring}>
        <FundingOpportunityForm
          initialValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/")}
          submitLabel="Save and score"
        />
      </div>
    </div>
  );
}
