export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-card">
        <h2 className="font-display text-[24px] font-bold tracking-[-.04em] text-ink-900">{title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{description}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${confirmVariant === "destructive" ? "btn-destructive" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
