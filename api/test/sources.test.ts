import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { env } from "../src/config/env.ts";
import { db } from "../src/lib/db.ts";
import { adminApi, describeDb, saveScore } from "./helpers.ts";

const api = adminApi();

describe("GET /api/sources", () => {
  it("404s on an unknown sub-path", async () => {
    const res = await api.get("/api/sources/fonde");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/sources/check", () => {
  const dispatchToken = env.GITHUB_DISPATCH_TOKEN;
  afterEach(() => {
    env.GITHUB_DISPATCH_TOKEN = dispatchToken;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubGitHub(response: Response) {
    env.GITHUB_DISPATCH_TOKEN = "test-token";
    const fetchFn = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetchFn);
    return fetchFn;
  }

  it("503s when no dispatch token is set", async () => {
    env.GITHUB_DISPATCH_TOKEN = undefined;

    const res = await api.post("/api/sources/check");

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("PIPELINE_UNAVAILABLE");
  });

  it("starts pipeline.yml on main and answers 202", async () => {
    const fetchFn = stubGitHub(new Response(null, { status: 204 }));

    const res = await api.post("/api/sources/check");

    expect(res.status).toBe(202);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/actions\/workflows\/pipeline\.yml\/dispatches$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ authorization: "Bearer test-token" });
    expect(JSON.parse(init.body as string)).toEqual({ ref: "main" });
  });

  it("502s when GitHub refuses", async () => {
    stubGitHub(new Response("Bad credentials", { status: 401 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await api.post("/api/sources/check");

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("PIPELINE_DISPATCH_FAILED");
    expect(log).toHaveBeenCalledWith(
      "Pipeline dispatch failed:",
      401,
      "Bad credentials",
    );
  });
});

describeDb("GET /api/sources (database)", () => {
  it("counts a source's calls: total, open, closed and relevant", async () => {
    const source = await db
      .insertInto("funding_source")
      .values({ name: `Test source ${Date.now()}`, source_type: " " })
      .returning("id")
      .executeTakeFirstOrThrow();
    onTestFinished(async () => {
      await db
        .deleteFrom("funding_call")
        .where("funding_source_id", "=", source.id)
        .execute();
      await db
        .deleteFrom("funding_source")
        .where("id", "=", source.id)
        .execute();
    });
    const call = async (
      status: "open" | "closed" | "unknown",
      deleted = false,
    ) =>
      (
        await db
          .insertInto("funding_call")
          .values({
            funding_source_id: source.id,
            title: "Test call",
            status,
            deleted_at: deleted ? new Date() : null,
          })
          .returning("id")
          .executeTakeFirstOrThrow()
      ).id;

    const relevant = await call("open");
    const overriddenUp = await call("closed");
    const dismissed = await call("open");
    const weak = await call("closed");
    await call("unknown");
    await saveScore(await call("open", true), 90);
    await saveScore(relevant, 80);
    await saveScore(overriddenUp, 30);
    await saveScore(dismissed, 90);
    await saveScore(weak, 40);
    await db
      .updateTable("match_result")
      .set({ review_status: "overridden", manual_score: 60 })
      .where("call_id", "=", overriddenUp)
      .execute();
    await db
      .updateTable("match_result")
      .set({ review_status: "dismissed" })
      .where("call_id", "=", dismissed)
      .execute();

    const res = await api.get("/api/sources");
    const item = res.body.items.find(
      (item: { id: number }) => item.id === source.id,
    );

    expect(res.status).toBe(200);
    expect(item).toEqual({
      id: source.id,
      name: expect.stringContaining("Test source"),
      sourceType: null,
      baseUrl: null,
      lastChecked: null,
      counts: { total: 5, open: 2, closed: 2, relevant: 2 },
    });
  });

  it("lists every source with consistent counts", async () => {
    const res = await api.get("/api/sources");
    const names = res.body.items.map((item: { name: string }) => item.name);

    expect(names).toContain("Added by hand");
    for (const { counts } of res.body.items) {
      expect(counts.total).toBeGreaterThanOrEqual(counts.open + counts.closed);
      expect(counts.relevant).toBeLessThanOrEqual(counts.total);
    }
  });
});
