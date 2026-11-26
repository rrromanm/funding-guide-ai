import type { Tag, TagType } from "@/lib/types";

const tagStyles: Record<TagType, string> = {
  Theme: "border-violet-200 bg-violet-50 text-violet-800",
  TargetGroup: "border-green-200 bg-green-50 text-green-800",
  Sector: "border-hairline bg-chip text-muted",
  Country: "border-hairline bg-chip text-muted",
  Other: "border-hairline bg-chip text-muted",
};

export function TagList({
  tags,
  editing,
  onRemove,
}: {
  tags: Tag[];
  editing?: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] font-semibold ${tagStyles[tag.type]}`}
        >
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
