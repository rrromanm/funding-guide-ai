"use client";

import { useState } from "react";
import type { OrgProfile } from "@/lib/types";
import { EditableTagGroup } from "@/components/shared/editable-tag-group";
import { TagList } from "@/components/shared/tag-list";

const humanize = (value: string) => value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

export default function ProfileForm({ initialProfile, onSave }: { initialProfile: OrgProfile; onSave: (profile: OrgProfile) => Promise<OrgProfile> }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

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
      {saveError && (
        <div role="alert" className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-600">
          {saveError}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="eyebrow mb-1">Organization information</p>
          <p className="text-[14px] text-muted">These details are fixed and cannot be changed here.</p>
        </div>
        <dl className="grid gap-5 sm:grid-cols-2 md:col-span-2 lg:grid-cols-3">
          {[
            ["Name", profile.name],
            ["Legal status", humanize(profile.legalStatus)],
            ["City", profile.city],
            ["Country", profile.country],
            ...(profile.foundedYear ? [["Founded", String(profile.foundedYear)]] : []),
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="field-label">{label}</dt>
              <dd className="break-words text-[16px] font-semibold text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-hairline pt-5 md:col-span-2">
          <p className="eyebrow mb-1">Matching information</p>
          <p className="text-[14px] text-muted">
            {editing ? "You can edit these fields." : "Used by the matcher. Choose Edit Profile to change them."}
          </p>
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
          <div className="mb-4">
            <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">What we work on</h2>
          </div>
          {editing ? (
            <div className="space-y-4">
              <EditableTagGroup
                label="Themes"
                helperText="What PYN's projects are about. The matcher compares these with each call's purpose."
                placeholder="Add a theme, e.g. Culture"
                tags={profile.themes}
                type="Theme"
                onChange={(themes) => handleChange("themes", themes)}
              />
              <EditableTagGroup
                label="Target groups"
                helperText="Who PYN's activities reach."
                placeholder="Add a target group"
                tags={profile.targetGroups}
                type="TargetGroup"
                onChange={(targetGroups) => handleChange("targetGroups", targetGroups)}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <div className="field-label mb-3">Themes · {profile.themes.length}</div>
                <TagList tags={profile.themes} />
              </section>
              <section className="border-t border-hairline pt-6">
                <div className="field-label mb-3">Target groups · {profile.targetGroups.length}</div>
                <TagList tags={profile.targetGroups} />
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {!editing ? (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => {
                setProfile(initialProfile);
                setEditing(false);
                setSaveError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSaveError("");
                setSavedMessage("");
                try {
                  const savedProfile = await onSave(profile);
                  setProfile(savedProfile);
                  setEditing(false);
                  setSavedMessage("Organization profile saved successfully.");
                } catch (error) {
                  setSaveError(error instanceof Error ? error.message : "Organization profile could not be saved.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
