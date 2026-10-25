import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { db } from "../src/lib/db.ts";

const app = createApp();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

afterAll(async () => {
  await db.destroy();
});

// Validation happens before the service, so these need no database.
describe("GET /api/calls (validation)", () => {
  it("rejects a limit above the maximum", async () => {
    const res = await request(app).get("/api/calls?limit=500");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      { path: "limit", message: expect.stringContaining("100") },
    ]);
  });

  it("rejects an unknown status", async () => {
    const res = await request(app).get("/api/calls?status=nope");

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("status");
  });

  it("rejects a non-numeric id", async () => {
    const res = await request(app).get("/api/calls/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-numeric id on delete", async () => {
    const res = await request(app).delete("/api/calls/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("GET /api/calls", () => {
  it("returns a page of calls", async () => {
    const res = await request(app).get("/api/calls?limit=5");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body).toMatchObject({ limit: 5, offset: 0 });
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.items.length);

    const [first] = res.body.items;
    expect(typeof first.id).toBe("number");
    expect(typeof first.title).toBe("string");
    expect(typeof first.recurring).toBe("boolean");
    expect(typeof first.currency).toBe("string");
  });

  it("orders by score, highest first and unscored calls last", async () => {
    const res = await request(app).get("/api/calls?limit=100");
    const items: { score: number | null; deadline: string | null }[] =
      res.body.items;

    for (const { deadline } of items) {
      if (deadline !== null) expect(deadline).toMatch(ISO_DATE);
    }

    const scores = items.map((item) => item.score);
    const scored = scores.filter((score) => score !== null);
    expect(scored).toEqual([...scored].sort((a, b) => b - a));
    for (const score of scores.slice(scored.length)) expect(score).toBeNull();
  });

  it("never lists a call scored 0, in any status", async () => {
    for (const status of ["", "&status=closed"]) {
      const res = await request(app).get(`/api/calls?limit=100${status}`);
      const scores = res.body.items.map(
        (item: { score: number | null }) => item.score,
      );
      expect(scores).not.toContain(0);
    }
  });

  it("includes the match score, manual override first", async () => {
    const match = await db
      .selectFrom("match_result")
      .select(["call_id", "score", "manual_score"])
      .executeTakeFirst();
    if (!match) return;

    const res = await request(app).get(`/api/calls/${match.call_id}`);

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(match.manual_score ?? match.score);
  });

  it("labels every scored call, and only those", async () => {
    const res = await request(app).get("/api/calls?limit=100");

    for (const item of res.body.items) {
      expect(item.fitLabel === null).toBe(item.score === null);
      if (item.score >= 75) expect(item.fitLabel).toBe("strong_fit");
    }
  });

  it("paginates with offset", async () => {
    const page = await request(app).get("/api/calls?limit=2");
    const next = await request(app).get("/api/calls?limit=2&offset=2");

    expect(next.body.total).toBe(page.body.total);
    expect(next.body.items.map((i: { id: number }) => i.id)).not.toEqual(
      page.body.items.map((i: { id: number }) => i.id),
    );
  });

  it("searches title, summary, body and description", async () => {
    const res = await request(app).get("/api/calls?q=musik");

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.total).toBeLessThan(
      (await request(app).get("/api/calls")).body.total,
    );
  });

  it("only returns closed calls when asked for them", async () => {
    const res = await request(app).get("/api/calls?status=closed");

    expect(res.status).toBe(200);
    for (const item of res.body.items) expect(item.status).toBe("closed");

    const listed = await request(app).get("/api/calls?limit=100");
    for (const item of listed.body.items)
      expect(item.status).not.toBe("closed");
  });

  it("filters by level", async () => {
    const res = await request(app).get("/api/calls?level=municipal");

    expect(res.status).toBe(200);
    for (const item of res.body.items) expect(item.level).toBe("municipal");
  });

  it("names the source each call came from", async () => {
    const res = await request(app).get("/api/calls?limit=5");

    expect(res.status).toBe(200);
    for (const item of res.body.items) expect(item.source).toBeTruthy();
  });
});

describe.skipIf(!process.env.DATABASE_URL)("GET /api/calls/:id", () => {
  it("returns one call with its rounds", async () => {
    const withRounds = await db
      .selectFrom("funding_round")
      .select("call_id")
      .executeTakeFirstOrThrow();

    const res = await request(app).get(`/api/calls/${withRounds.call_id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(withRounds.call_id);
    expect(res.body.sourceUrl).toMatch(/^https?:\/\//);
    expect(Array.isArray(res.body.themes)).toBe(true);
    expect(res.body.rounds.length).toBeGreaterThan(0);

    for (const round of res.body.rounds) {
      if (round.deadlineDate !== null)
        expect(round.deadlineDate).toMatch(ISO_DATE);
    }
  });

  it("explains the AI recommendation", async () => {
    const reason = await db
      .selectFrom("match_reason")
      .innerJoin("match_result", "match_result.id", "match_reason.match_id")
      .select([
        "match_result.call_id",
        "match_result.confidence",
        "match_result.blocking_reason",
      ])
      .executeTakeFirst();
    if (!reason) return;

    const res = await request(app).get(`/api/calls/${reason.call_id}`);

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe(reason.confidence);
    expect(res.body.blockingReason).toBe(reason.blocking_reason);
    expect(res.body.reasons.length).toBeGreaterThan(0);
    expect(res.body.reasons[0]).toEqual({
      kind: expect.any(String),
      about: expect.any(String),
      message: expect.any(String),
    });
  });

  it("returns a 404 for an id that does not exist", async () => {
    const res = await request(app).get("/api/calls/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Call not found");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("DELETE /api/calls/:id", () => {
  it("hides the call, and the scraper's upsert does not bring it back", async () => {
    const source = await db
      .selectFrom("funding_source")
      .select("id")
      .executeTakeFirstOrThrow();
    const sourceUrl = `https://example.test/delete-${Date.now()}`;
    const { id } = await db
      .insertInto("funding_call")
      .values({
        funding_source_id: source.id,
        source_url: sourceUrl,
        title: "Test call",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const deleted = await request(app).delete(`/api/calls/${id}`);
    const fetched = await request(app).get(`/api/calls/${id}`);
    const again = await request(app).delete(`/api/calls/${id}`);
    
    await db
      .insertInto("funding_call")
      .values({
        funding_source_id: source.id,
        source_url: sourceUrl,
        title: "Test call",
      })
      .onConflict((oc) =>
        oc
          .columns(["funding_source_id", "source_url"])
          .doUpdateSet((eb) => ({ title: eb.ref("excluded.title") })),
      )
      .execute();
    const rescraped = await request(app).get(`/api/calls/${id}`);

    await db.deleteFrom("funding_call").where("id", "=", id).execute();

    expect(deleted.status).toBe(204);
    expect(fetched.status).toBe(404);
    expect(again.status).toBe(404);
    expect(rescraped.status).toBe(404);
  });

  it("returns a 404 for an id that does not exist", async () => {
    const res = await request(app).delete("/api/calls/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
