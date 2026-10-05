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

  it("orders by the nearest upcoming deadline, undated calls last", async () => {
    const res = await request(app).get("/api/calls?limit=100");
    const deadlines = res.body.items.map(
      (item: { deadline: string | null }) => item.deadline,
    );

    for (const deadline of deadlines) {
      if (deadline !== null) expect(deadline).toMatch(ISO_DATE);
    }

    const dated = deadlines.filter((deadline: string | null) => deadline);
    expect(dated).toEqual([...dated].sort());
    for (const deadline of deadlines.slice(dated.length))
      expect(deadline).toBeNull();
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

  it("returns a 404 for an id that does not exist", async () => {
    const res = await request(app).get("/api/calls/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Call not found");
  });
});
