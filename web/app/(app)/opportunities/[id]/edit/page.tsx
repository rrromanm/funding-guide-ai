import { redirect } from "next/navigation";
import OpportunityEditClient from "@/components/opportunity-edit-client";
import { getFundingCall } from "@/lib/services";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = getFundingCall(id);

  if (!call) {
    redirect("/");
  }

  return <OpportunityEditClient opportunity={call} />;
}
