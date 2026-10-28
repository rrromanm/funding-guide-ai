"use client";

import { useState } from "react";
import type { OrgProfile, Tag, TagType } from "@/lib/types";

const tagStyles: Record<TagType, string> = {
  Theme: "border-violet-200 bg-violet-50 text-violet-800",
  TargetGroup: "border-green-200 bg-green-50 text-green-800",
  Sector: "border-hairline bg-chip text-muted",
  Country: "border-hairline bg-chip text-muted",
  Other: "border-hairline bg-chip text-muted",
};

function ProfileTags({ tags, editing, onRemove }: { tags: Tag[]; editing?: boolean; onRemove?: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag.id} className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] font-semibold ${tagStyles[tag.type]}`}>
          <span className="break-words">{tag.value}</span>
          {editing && onRemove && (
            <button
              type="button"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-current hover:bg-black/10"
              aria-label={`Remove ${tag.value}`}
              onClick={() => onRemove(tag.id)}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export function EditableTagGroup({
  label,
  helperText,
  placeholder,
  tags,
  type,
  onChange,
}: {
  label: string;
  helperText: string;
  placeholder: string;
  tags: Tag[];
  type: TagType;
  onChange: (tags: Tag[]) => void;
}) {
  const [newValue, setNewValue] = useState("");

  const addTag = () => {
    const value = newValue.trim();
    if (!value || tags.some((tag) => tag.value === value)) {
      return;
    }

    onChange([...tags, { id: `${type}-${value}-${Date.now()}`, value, type }]);
    setNewValue("");
  };

  return (
    <section className="rounded-[20px] border border-hairline bg-canvas p-4 sm:p-5">
      <div className="mb-4">
        <div className="field-label mb-2">{label} · {tags.length}</div>
        <p className="text-[14px] leading-relaxed text-muted">{helperText}</p>
      </div>
      <ProfileTags tags={tags} editing onRemove={(id) => onChange(tags.filter((tag) => tag.id !== id))} />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={newValue}
          placeholder={placeholder}
          aria-label={`New ${label.toLowerCase()}`}
          className="input min-w-0 flex-1"
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <button type="button" className="btn btn-secondary shrink-0" onClick={addTag}>
          + Add
        </button>
      </div>
    </section>
  );
}

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
                <ProfileTags tags={profile.themes} />
              </section>
              <section className="border-t border-hairline pt-6">
                <div className="field-label mb-3">Target groups · {profile.targetGroups.length}</div>
                <ProfileTags tags={profile.targetGroups} />
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
