import { notFound } from "next/navigation";
import OpportunityEditClient from "@/components/opportunity-edit-client";
import { ApiRequestError, getFundingCallDto } from "@/lib/services";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let call;

  try {
    call = await getFundingCallDto(id);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <OpportunityEditClient call={call} />;
}
