"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/common";
import { getFundingSources } from "@/lib/services";
import type { SourceListItem } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSourceType(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Unclassified";
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="card min-w-0">
      <p className="field-label">{label}</p>
      <p className="font-display text-[32px] font-bold leading-none text-ink-900">{value}</p>
      <p className="mt-3 text-[14px] text-muted">{detail}</p>
    </div>
  );
}

function SourceRow({ source }: { source: SourceListItem }) {
  return (
    <article className="border-t border-hairline py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[19px] font-bold text-ink-900">{source.name}</h3>
            <span className="chip-neutral">{formatSourceType(source.sourceType)}</span>
          </div>
          {source.baseUrl && (
            <a
              href={source.baseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-violet-600 hover:text-violet-800"
            >
              {source.baseUrl}
            </a>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-5 text-left lg:text-right">
          <div>
            <p className="field-label">Stored calls</p>
            <p className="font-display text-[22px] font-bold text-ink-900">{source.counts.total}</p>
          </div>
          <div>
            <p className="field-label">Open</p>
            <p className="font-display text-[22px] font-bold text-green-800">{source.counts.open}</p>
          </div>
          <div>
            <p className="field-label">Last checked</p>
            <p className="text-[14px] text-ink-600">{formatDate(source.lastChecked)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-label="Loading source information" role="status">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="card h-36 animate-pulse bg-white/70" />)}
      </div>
      <div className="card h-72 animate-pulse bg-white/70" />
    </div>
  );
}

export default function SourcesCoveragePage() {
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await getFundingSources();
      setSources(response.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadSources();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadSources]);

  const totals = useMemo(
    () => sources.reduce(
      (result, source) => ({
        total: result.total + source.counts.total,
        relevant: result.relevant + source.counts.relevant,
        open: result.open + source.counts.open,
        closed: result.closed + source.counts.closed,
      }),
      { total: 0, relevant: 0, open: 0, closed: 0 },
    ),
    [sources],
  );

  const coverageGroups = useMemo(() => {
    const groups = new Map<string, number>();
    sources.forEach((source) => {
      const label = formatSourceType(source.sourceType);
      groups.set(label, (groups.get(label) ?? 0) + 1);
    });
    return [...groups.entries()].sort((left, right) => right[1] - left[1]);
  }, [sources]);

  return (
    <div className="p-8">
      <PageHeader
        title="Sources & Coverage"
        subtitle="Overview of funding sources monitored by the Funding Guide ingestion system."
      />

      {loading ? <LoadingState /> : error ? (
        <div className="card flex flex-col items-start gap-4">
          <div>
            <h2 className="font-display text-[21px] font-bold text-ink-900">Source information could not be loaded.</h2>
            <p className="mt-2 text-[15px] text-ink-600">The API did not return source coverage data.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadSources()}>Retry</button>
        </div>
      ) : sources.length === 0 ? (
        <EmptyState title="No funding sources are currently configured." description="Source coverage will appear here when the ingestion system has configured sources." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Configured sources" value={sources.length} detail="Sources returned by the API" />
            <MetricCard label="Stored calls" value={totals.total} detail="Calls across all sources" />
            <MetricCard label="Open calls" value={totals.open} detail="Currently marked open" />
            <MetricCard label="Relevant calls" value={totals.relevant} detail="Strong or possible fit, not dismissed" />
          </section>

          <section className="card mt-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow mb-2">Automated ingestion modules</p>
                <h2 className="font-display text-[24px] font-bold text-ink-900">Monitored funding sources</h2>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">discover → fetch → parse → normalise → dedupe → store</p>
            </div>
            <div>
              {sources.map((source) => <SourceRow key={source.id} source={source} />)}
            </div>
          </section>

          {coverageGroups.length > 0 && (
            <section className="card mt-6">
              <p className="eyebrow mb-2">Coverage by source classification</p>
              <h2 className="font-display text-[24px] font-bold text-ink-900">Source coverage</h2>
              <div className="mt-6 space-y-5">
                {coverageGroups.map(([label, count]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-[14px]">
                      <span className="font-bold text-ink-900">{label}</span>
                      <span className="text-muted">{count} {count === 1 ? "source" : "sources"}</span>
                    </div>
                    <div className="meter"><div className="meter-fill" style={{ width: `${(count / sources.length) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}