import { notFound } from "next/navigation";
import { AuthErrorNotice } from "@/components/auth-error-notice";
import OpportunityEditClient from "@/components/opportunity-edit-client";
import { ApiRequestError, getFundingCallDto, isAuthErrorStatus } from "@/lib/services";
import { getAccessToken } from "@/lib/supabase/server";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let call;

  try {
    call = await getFundingCallDto(id, await getAccessToken());
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiRequestError && isAuthErrorStatus(error.status)) {
      return <AuthErrorNotice status={error.status} />;
    }
    throw error;
  }

  return <OpportunityEditClient call={call} />;
}
