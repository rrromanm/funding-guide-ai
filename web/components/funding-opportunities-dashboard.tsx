"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFundingCalls } from "@/lib/services";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { getDisplayedDeadline } from "@/lib/funding-deadlines";
import { API_FIT_LABELS, FIT_LABEL_CHIPS, FIT_LABELS } from "@/lib/fit-label";
import type { FundingCall, FundingCallListItem } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;
const ALL_FITS = "All fits";

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FundingOpportunitiesDashboard() {
  const [calls, setCalls] = useState<FundingCallListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All levels");
  const [selectedFit, setSelectedFit] = useState(ALL_FITS);
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const latestRequest = useRef(0);

  const loadCalls = useCallback(async (term: string) => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(false);
    try {
      const result = await getFundingCalls(term || undefined);
      if (request === latestRequest.current) setCalls(result);
    } catch {
      if (request === latestRequest.current) setError(true);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadCalls(debouncedSearch);
    });

    return () => cancelAnimationFrame(frame);
  }, [loadCalls, debouncedSearch]);

  const levels = ["All levels", ...new Set(calls.map((call) => call.fundingLevel).filter(Boolean))];
  const statuses = ["All statuses", "OPEN", "UPCOMING", "CLOSED", "UNKNOWN"];
  const fits = [ALL_FITS, ...API_FIT_LABELS.map((fit) => FIT_LABELS[fit])];

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      const matchesLevel = selectedLevel === "All levels" || call.fundingLevel === selectedLevel;
      const matchesStatus = selectedStatus === "All statuses" || call.status === selectedStatus;
      const matchesFit = selectedFit === ALL_FITS || (call.fitLabel !== undefined && FIT_LABELS[call.fitLabel] === selectedFit);

      return matchesLevel && matchesStatus && matchesFit;
    });
  }, [calls, selectedLevel, selectedStatus, selectedFit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageNumber = Math.min(page, totalPages);
  const visibleCalls = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  const hasFilters = search !== "" || selectedLevel !== "All levels" || selectedFit !== ALL_FITS || selectedStatus !== "All statuses";

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedLevel("All levels");
    setSelectedFit(ALL_FITS);
    setSelectedStatus("All statuses");
    setPage(1);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Funding Opportunities"
        subtitle="Review current opportunities, status updates, and AI-generated recommendations."
        action={
          <Link href="/opportunities/new" className="btn btn-primary">
            Add opportunity
          </Link>
        }
      />

      <section className="card mb-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">
          <div className="sm:col-span-2 xl:col-span-1">
            <label htmlFor="opportunity-search" className="field-label">Search</label>
            <input
              id="opportunity-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, funder, or description"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="opportunity-level" className="field-label">Funding level</label>
            <select
              id="opportunity-level"
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="opportunity-fit" className="field-label">Fit</label>
            <select
              id="opportunity-fit"
              value={selectedFit}
              onChange={(event) => {
                setSelectedFit(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {fits.map((fit) => (
                <option key={fit} value={fit}>
                  {fit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="opportunity-status" className="field-label">Status</label>
            <select
              id="opportunity-status"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="card space-y-4" role="status" aria-label="Loading funding opportunities">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-[12px] bg-violet-50" />)}
        </div>
      ) : error ? (
        <div className="card flex flex-col items-start gap-4">
          <div>
            <h2 className="font-display text-[21px] font-bold text-ink-900">Funding opportunities could not be loaded.</h2>
            <p className="mt-2 text-[15px] text-ink-600">The API did not return the opportunity list.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadCalls(debouncedSearch)}>Retry</button>
        </div>
      ) : visibleCalls.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No funding opportunities found." : "No funding opportunities are currently available."}
          description={hasFilters ? "Try adjusting your search or filters." : "The API returned no opportunities."}
          action={
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-violet-50 text-[12px] uppercase tracking-[.14em] text-muted">
                <tr>
                  <th className="px-5 py-4">Title</th>
                  <th className="px-5 py-4">Funder</th>
                  <th className="px-5 py-4">Deadline</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Match score</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleCalls.map((call) => {
                  return (
                    <tr key={call.id} className="border-t border-hairline align-top">
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <Link href={`/opportunities/${call.id}`} className="font-bold text-ink-900 hover:text-violet-600 hover:no-underline">
                            {call.title}
                          </Link>
                          {call.recurringCall && (
                            <div className="chip-neutral">Recurring call</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink-600">{call.fundingBody || "—"}</td>
                      <td className="px-5 py-4 text-ink-600">{formatDate(call.deadline)}</td>
                      <td className="px-5 py-4"><StatusBadge status={call.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ink-600">{call.score === undefined ? "—" : `${call.score}/100`}</span>
                          {call.fitLabel && <span className={`chip ${FIT_LABEL_CHIPS[call.fitLabel]}`}>{FIT_LABELS[call.fitLabel]}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/opportunities/${call.id}`} className="font-bold text-violet-600 hover:no-underline hover:text-violet-800">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-4">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pageNumber === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <p className="text-[14px] text-muted">
              Page {pageNumber} of {totalPages}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pageNumber >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function formatMoney(value?: number) {
  if (value === undefined || value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatList(tags: { value: string }[] = []) {
  return tags.length ? tags.map((tag) => tag.value).join(", ") : "—";
}

export function formatOpportunityDates(call: FundingCall) {
  const deadline = getDisplayedDeadline(call.fundingRounds, call.status);
  return deadline ? formatDate(deadline) : "—";
}
