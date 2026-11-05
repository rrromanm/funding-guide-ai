import { notFound } from "next/navigation";
import FundingOpportunityDetail from "@/components/funding-opportunity-detail";
import { ApiRequestError, getFundingCallById } from "@/lib/services";
import { getAccessToken } from "@/lib/supabase/server";

export default async function FundingOpportunityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let call;

  try {
    call = await getFundingCallById(id, await getAccessToken());
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <FundingOpportunityDetail initialCall={call} />;
}
