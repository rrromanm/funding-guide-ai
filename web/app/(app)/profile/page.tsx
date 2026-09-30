"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common";
import ProfileForm from "@/components/profile-form";
import { getOrgProfile, updateOrgProfile } from "@/lib/services";

export default function OrganizationProfilePage() {
  const [profile, setProfile] = useState(getOrgProfile());

  return (
    <div className="p-8">
      <PageHeader
        title="Organization Profile"
        subtitle="These details inform how funding opportunities are matched to the PYN strategy and organisational profile."
      />

      <ProfileForm
        initialProfile={profile}
        onSave={(nextProfile) => {
          const updated = updateOrgProfile(nextProfile);
          setProfile(updated);
        }}
      />
    </div>
  );
}
