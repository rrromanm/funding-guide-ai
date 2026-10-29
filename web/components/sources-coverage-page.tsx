"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { checkAllSources, getFundingSources } from "@/lib/services";
import type { SourceListItem } from "@/lib/types";

const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

function formatLastChecked(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return value;
  }

  const minutes = Math.round((time - Date.now()) / 60_000);
  if (minutes > -1) return "Just now";
  if (minutes > -60) return relative.format(minutes, "minute");
  if (minutes > -60 * 24) return relative.format(Math.round(minutes / 60), "hour");
  return relative.format(Math.round(minutes / (60 * 24)), "day");
}

function formatSourceType(value: string | null) {
  if (!value) return "Unclassified";
  const label = value.replaceAll("_", " ");
  return label.length <= 2 ? label.toUpperCase() : label[0].toUpperCase() + label.slice(1);
}

function MetricCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="card min-w-0">
      <p className="field-label">{label}</p>
      <p className={`font-display text-[40px] font-bold leading-none ${className}`}>{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-label="Loading source information" role="status">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="card h-28 animate-pulse bg-white/70" />)}
      </div>
      <div className="card h-72 animate-pulse bg-white/70" />
    </div>
  );
}

export default function SourcesCoveragePage() {
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [check, setCheck] = useState<"idle" | "starting" | "started" | "failed">("idle");
  const [checkError, setCheckError] = useState("");

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

  async function checkAll() {
    setCheck("starting");
    try {
      await checkAllSources();
      setCheck("started");
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "The source check could not be started.");
      setCheck("failed");
    }
  }

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

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="field-label">Where calls are collected from{!loading && ` · ${sources.length} sources`}</p>
          <h1 className="font-display text-[30px] font-bold tracking-[-.04em] text-ink-900">Sources</h1>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={check === "starting" || check === "started"}
            onClick={() => void checkAll()}
          >
            {check === "starting" ? "Starting…" : "Check all sources now"}
          </button>
          <p role="status" className={`text-[14px] ${check === "failed" ? "text-red-600" : "text-muted"}`}>
            {check === "started" && "Check started. New calls appear here when it finishes."}
            {check === "failed" && checkError}
          </p>
        </div>
      </div>

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
            <MetricCard label="Total calls found" value={totals.total} className="text-ink-900" />
            <MetricCard label="Relevant calls" value={totals.relevant} className="text-green-800" />
            <MetricCard label="Open" value={totals.open} className="text-violet-800" />
            <MetricCard label="Closed" value={totals.closed} className="text-ink-600" />
          </section>

          <div className="card mt-6 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="font-mono text-[12px] uppercase tracking-[.12em] text-muted">
                  <tr>
                    <th className="px-5 py-4 font-normal">Source</th>
                    <th className="px-5 py-4 font-normal">Level</th>
                    <th className="whitespace-nowrap px-5 py-4 font-normal">Last checked</th>
                    <th className="px-5 py-4 text-center font-normal">Total</th>
                    <th className="px-5 py-4 text-center font-normal">Relevant</th>
                    <th className="px-5 py-4 text-center font-normal">Open</th>
                    <th className="px-5 py-4 text-center font-normal">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-t border-hairline align-middle">
                      <td className="px-5 py-5">
                        <p className="font-bold text-ink-900">{source.name}</p>
                        {source.baseUrl && (
                          <a
                            href={source.baseUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={source.baseUrl}
                            className="mt-1 block max-w-88 truncate font-mono text-[14px] text-violet-600 hover:text-violet-800"
                          >
                            {source.baseUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-5"><span className="chip-neutral">{formatSourceType(source.sourceType)}</span></td>
                      <td className="whitespace-nowrap px-5 py-5 text-ink-900">{formatLastChecked(source.lastChecked)}</td>
                      <td className="px-5 py-5 text-center font-display text-[20px] font-bold text-ink-900">{source.counts.total}</td>
                      <td className="px-5 py-5 text-center font-display text-[20px] font-bold text-green-800">{source.counts.relevant}</td>
                      <td className="px-5 py-5 text-center font-display text-[20px] font-bold text-violet-800">{source.counts.open}</td>
                      <td className="px-5 py-5 text-center font-display text-[20px] font-bold text-ink-600">{source.counts.closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
