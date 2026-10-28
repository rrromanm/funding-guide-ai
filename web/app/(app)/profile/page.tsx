"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import ProfileForm from "@/components/profile-form";
import { getOrgProfile, updateOrgProfile } from "@/lib/services";
import type { OrgProfile } from "@/lib/types";

export default function OrganizationProfilePage() {
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getOrgProfile());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Organization profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadProfile();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadProfile]);

  const content = loading ? (
    <div className="card space-y-4" role="status" aria-label="Loading organization profile">
      {[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-[12px] bg-violet-50" />)}
    </div>
  ) : error ? (
    <div className="card flex flex-col items-start gap-4">
      <div>
        <h2 className="font-display text-[21px] font-bold text-ink-900">Organization profile could not be loaded.</h2>
        <p className="mt-2 text-[15px] text-ink-600">{error}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => void loadProfile()}>Retry</button>
    </div>
  ) : profile ? (
    <ProfileForm
      initialProfile={profile}
      onSave={async (nextProfile) => {
        const updated = await updateOrgProfile(nextProfile);
        setProfile(updated);
        return updated;
      }}
    />
  ) : null;

  return (
    <div className="p-8">
      <PageHeader
        title="Organization Profile"
        subtitle="These details inform how funding opportunities are matched to the PYN strategy and organisational profile."
      />

      {content}
    </div>
  );
}
