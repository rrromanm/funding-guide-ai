import { notFound } from "next/navigation";
import { AuthErrorNotice } from "@/features/auth/components/auth-error-notice";
import OpportunityEditClient from "@/features/opportunities/components/opportunity-edit-client";
import { ApiRequestError, isAuthErrorStatus } from "@/lib/api/client";
import { getFundingCallDto } from "@/features/opportunities/api";
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
