"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getFundingCalls } from "@/lib/services";
import { PageHeader, StatusBadge, EmptyState } from "@/components/common";
import { getDisplayedDeadline } from "@/lib/funding-deadlines";
import type { FundingCall } from "@/lib/types";

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
  const calls = getFundingCalls();
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All levels");
  const [selectedTheme, setSelectedTheme] = useState("All themes");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [selectedRegion, setSelectedRegion] = useState("All regions");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const levels = ["All levels", ...new Set(calls.map((call) => call.fundingLevel).filter(Boolean))];
  const themes = [
    "All themes",
    ...new Set(calls.flatMap((call) => call.themes.map((tag) => tag.value))),
  ];
  const statuses = ["All statuses", "OPEN", "UPCOMING", "CLOSED", "UNKNOWN"];
  const regions = ["All regions", ...new Set(calls.flatMap((call) => call.relevantRegions ?? []))];

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return calls.filter((call) => {
      const matchesSearch =
        !normalized ||
        call.title.toLowerCase().includes(normalized) ||
        call.fundingBody.toLowerCase().includes(normalized) ||
        call.summary.toLowerCase().includes(normalized);

      const matchesLevel = selectedLevel === "All levels" || call.fundingLevel === selectedLevel;
      const matchesTheme =
        selectedTheme === "All themes" || call.themes.some((tag) => tag.value === selectedTheme);
      const matchesStatus = selectedStatus === "All statuses" || call.status === selectedStatus;
      const matchesRegion =
        selectedRegion === "All regions" || (call.relevantRegions ?? []).includes(selectedRegion);

      return matchesSearch && matchesLevel && matchesTheme && matchesStatus && matchesRegion;
    });
  }, [calls, search, selectedLevel, selectedTheme, selectedStatus, selectedRegion]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageNumber = Math.min(page, totalPages);
  const visibleCalls = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  const clearFilters = () => {
    setSearch("");
    setSelectedLevel("All levels");
    setSelectedTheme("All themes");
    setSelectedStatus("All statuses");
    setSelectedRegion("All regions");
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
        <div className="grid gap-4 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div>
            <label className="field-label">Search</label>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, funder, or summary"
              className="input"
            />
          </div>

          <div>
            <label className="field-label">Funding level</label>
            <select
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
            <label className="field-label">Theme</label>
            <select
              value={selectedTheme}
              onChange={(event) => {
                setSelectedTheme(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Status</label>
            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All statuses" ? status : status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Region</label>
            <select
              value={selectedRegion}
              onChange={(event) => {
                setSelectedRegion(event.target.value);
                setPage(1);
              }}
              className="input"
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">
            {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
          {(search || selectedLevel !== "All levels" || selectedTheme !== "All themes" || selectedStatus !== "All statuses" || selectedRegion !== "All regions") && (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {visibleCalls.length === 0 ? (
        <EmptyState
          title="No funding opportunities found."
          description="Try adjusting your search or filters."
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
                  const deadline = getDisplayedDeadline(call.fundingRounds, call.status);
                  const recurringLabel = call.recurringCall && call.expectedReopeningDate
                    ? `Expected to reopen: ${formatDate(call.expectedReopeningDate)}`
                    : null;

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
                          {recurringLabel && (
                            <div className="text-[13px] text-muted">{recurringLabel}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink-600">{call.fundingBody}</td>
                      <td className="px-5 py-4 text-ink-600">{formatDate(deadline)}</td>
                      <td className="px-5 py-4"><StatusBadge status={call.status} /></td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-[13px] font-bold text-violet-800">
                          {call.matchResult.overallScore}/100
                        </span>
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
