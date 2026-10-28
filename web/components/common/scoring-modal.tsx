export function ScoringModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div role="status" aria-live="polite" className="flex w-full max-w-md flex-col items-center gap-5 rounded-[24px] bg-white p-8 text-center shadow-card">
        <div className="size-12 rounded-full border-4 border-violet-200 border-t-violet-600 motion-safe:animate-spin" />
        <div>
          <h2 className="font-display text-[24px] font-bold tracking-[-.03em] text-ink-900">Scoring this opportunity…</h2>
          <p className="mt-2 text-[15px] text-ink-600">
            The AI is reading the call and comparing it with PYN&apos;s profile. You&apos;ll see the result as
            soon as it&apos;s done.
          </p>
        </div>
      </div>
    </div>
  );
}
