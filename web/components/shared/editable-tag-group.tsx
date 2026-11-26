"use client";

import { useState } from "react";
import { TagList } from "./tag-list";
import type { Tag, TagType } from "@/lib/types";

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
      <TagList tags={tags} editing onRemove={(id) => onChange(tags.filter((tag) => tag.id !== id))} />
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
