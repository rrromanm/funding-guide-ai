"use client";

import { useState } from "react";
import type { OrgProfile } from "@/lib/types";

export default function ProfileForm({ initialProfile, onSave }: { initialProfile: OrgProfile; onSave: (profile: OrgProfile) => void }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const handleChange = <K extends keyof OrgProfile>(key: K, value: OrgProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="card flex flex-col gap-6">
      {savedMessage && (
        <div className="rounded-[20px] border border-green-200 bg-green-50 px-4 py-3 text-[14px] font-bold text-green-800">
          {savedMessage}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="profile-name" className="field-label">Name</label>
          <input id="profile-name" readOnly={!editing} value={profile.name} onChange={(event) => handleChange("name", event.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="profile-legal-status" className="field-label">Legal status</label>
          <input id="profile-legal-status" readOnly={!editing} value={profile.legalStatus} onChange={(event) => handleChange("legalStatus", event.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="profile-city" className="field-label">City</label>
          <input id="profile-city" readOnly={!editing} value={profile.city} onChange={(event) => handleChange("city", event.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="profile-country" className="field-label">Country</label>
          <input id="profile-country" readOnly={!editing} value={profile.country} onChange={(event) => handleChange("country", event.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="profile-staff-count" className="field-label">Staff count / team size</label>
          <input id="profile-staff-count" readOnly={!editing} type="number" min="0" value={profile.staffCount} onChange={(event) => handleChange("staffCount", Number(event.target.value))} className="input" />
        </div>
        <div>
          <label htmlFor="profile-capacity" className="field-label">Administrative capacity</label>
          <input id="profile-capacity" readOnly={!editing} value={profile.administrativeCapacity} onChange={(event) => handleChange("administrativeCapacity", event.target.value)} className="input" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="profile-themes" className="field-label">Themes / Tags</label>
          <input id="profile-themes" readOnly={!editing} value={profile.themes.map((tag) => tag.value).join(", ")} onChange={(event) => handleChange("themes", event.target.value.split(",").map((value, index) => ({ id: `${value}-${index}`, value: value.trim(), type: "Theme" as const })))} className="input" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="profile-target-groups" className="field-label">Target groups / Tags</label>
          <input id="profile-target-groups" readOnly={!editing} value={profile.targetGroups.map((tag) => tag.value).join(", ")} onChange={(event) => handleChange("targetGroups", event.target.value.split(",").map((value, index) => ({ id: `${value}-${index}`, value: value.trim(), type: "TargetGroup" as const })))} className="input" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {!editing ? (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => {
              setProfile(initialProfile);
              setEditing(false);
            }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onSave(profile);
                setEditing(false);
                setSavedMessage("Organization profile saved successfully.");
              }}
            >
              Save Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}
