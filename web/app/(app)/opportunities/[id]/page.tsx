import { redirect } from "next/navigation";
import FundingOpportunityDetail from "@/components/funding-opportunity-detail";
import { getFundingCall } from "@/lib/services";

export default async function FundingOpportunityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = getFundingCall(id);

  if (!call) {
    redirect("/");
  }

  return <FundingOpportunityDetail initialCall={call} />;
}
