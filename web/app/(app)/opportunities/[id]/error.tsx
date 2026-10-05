"use client";

import Link from "next/link";

export default function OpportunityDetailsError({ reset }: { reset: () => void }) {
  return (
    <div className="p-8">
      <div className="card flex flex-col items-start gap-4">
        <div>
          <p className="eyebrow mb-2">Funding opportunity</p>
          <h1 className="font-display text-[26px] font-bold text-ink-900">Opportunity could not be loaded.</h1>
          <p className="mt-2 text-[15px] text-ink-600">The funding service returned an error. Please try again.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>Retry</button>
          <Link href="/" className="btn btn-secondary">Back to Funding Opportunities</Link>
        </div>
      </div>
    </div>
  );
}