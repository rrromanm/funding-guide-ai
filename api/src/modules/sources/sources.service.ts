import { env } from "../../config/env.ts";
import { HttpError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { SourceListResponse } from "./sources.schema.ts";

const RELEVANT_FIT = ["strong_fit", "possible_fit"];
const PIPELINE_DISPATCH_URL =
  "https://api.github.com/repos/rrromanm/funding-guide-ai/actions/workflows/pipeline.yml/dispatches";

export async function findSources(): Promise<SourceListResponse> {
  const rows = await db
    .selectFrom("funding_source")
    .leftJoin("funding_call", (join) =>
      join
        .onRef("funding_call.funding_source_id", "=", "funding_source.id")
        .on("funding_call.deleted_at", "is", null),
    )
    .leftJoin("match_result", "match_result.call_id", "funding_call.id")
    .select(({ fn }) => [
      "funding_source.id",
      "funding_source.name",
      "funding_source.source_type",
      "funding_source.base_url",
      "funding_source.last_checked",
      fn.count<number>("funding_call.id").as("total"),
      fn
        .count<number>("funding_call.id")
        .filterWhere("funding_call.status", "=", "open")
        .as("open"),
      fn
        .count<number>("funding_call.id")
        .filterWhere("funding_call.status", "=", "closed")
        .as("closed"),
      fn
        .count<number>("funding_call.id")
        .filterWhere("match_result.fit_label", "in", RELEVANT_FIT)
        .filterWhere("match_result.review_status", "!=", "dismissed")
        .as("relevant"),
    ])
    .groupBy("funding_source.id")
    .orderBy("funding_source.name")
    .execute();

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sourceType: row.source_type?.trim() || null,
      baseUrl: row.base_url?.trim() || null,
      lastChecked: row.last_checked?.toISOString() ?? null,
      counts: {
        total: row.total,
        relevant: row.relevant,
        open: row.open,
        closed: row.closed,
      },
    })),
  };
}

// Starts the scrape + scoring workflow; it runs on GitHub Actions, results land in the DB later.
export async function startPipeline(): Promise<void> {
  if (!env.GITHUB_DISPATCH_TOKEN)
    throw new HttpError(
      503,
      "PIPELINE_UNAVAILABLE",
      "The manual source check is not configured",
    );

  const res = await fetch(PIPELINE_DISPATCH_URL, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (!res.ok) {
    console.error("Pipeline dispatch failed:", res.status, await res.text());
    throw new HttpError(
      502,
      "PIPELINE_DISPATCH_FAILED",
      "GitHub did not start the source check",
    );
  }
}
