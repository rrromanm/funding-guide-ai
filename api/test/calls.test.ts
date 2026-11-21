import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { env } from "../src/config/env.ts";
import { db } from "../src/lib/db.ts";
import { MIN_DESCRIPTION_CHARS } from "../src/modules/matches/matches.config.ts";
import {
  adminApi,
  describeDb,
  insertCall,
  modelOutput,
  saveScore,
} from "./helpers.ts";

const generateJson = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/llm.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/llm.ts")>()),
  geminiProvider: (_key: string, model: string) => ({ model, generateJson }),
}));

const api = adminApi();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DESCRIPTION = "Puljen støtter ungdomskultur i Danmark. ".repeat(15);
const token = () =>
  `zztest${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

const geminiKey = env.GEMINI_API_KEY;
beforeEach(() => {
  env.GEMINI_API_KEY = "test-key";
  generateJson.mockReset().mockResolvedValue(modelOutput(3));
});
afterEach(() => {
  env.GEMINI_API_KEY = geminiKey;
});

describe("GET /api/calls (validation)", () => {
  it("rejects a limit above the maximum", async () => {
    const res = await api.get("/api/calls?limit=500");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      { path: "limit", message: expect.stringContaining("100") },
    ]);
  });

  it.each([
    ["status", "status=nope"],
    ["level", "level=planet"],
    ["limit", "limit=0"],
    ["offset", "offset=-1"],
    ["q", `q=${"x".repeat(201)}`],
  ])("rejects a bad %s", async (path, query) => {
    const res = await api.get(`/api/calls?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe(path);
  });
});

describe("/api/calls/:id (validation)", () => {
  it.each([
    ["GET", "/api/calls/abc"],
    ["GET", "/api/calls/0"],
    ["DELETE", "/api/calls/abc"],
    ["PATCH", "/api/calls/abc"],
    ["POST", "/api/calls/abc/score"],
    ["PATCH", "/api/calls/1.5/match"],
  ])(
    "%s %s rejects an id that is not a positive integer",
    async (method, path) => {
      const res = await api[method.toLowerCase() as "get"](path).send({});

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe("id");
    },
  );
});

describe("POST /api/calls (validation)", () => {
  it.each([
    ["title", { description: DESCRIPTION }],
    ["title", { title: "  ", description: DESCRIPTION }],
    ["description", { title: "Call" }],
    ["description", { title: "Call", description: "Too short." }],
    [
      "sourceUrl",
      { title: "Call", description: DESCRIPTION, sourceUrl: "www" },
    ],
    ["currency", { title: "Call", description: DESCRIPTION, currency: "dkk" }],
    ["budgetMin", { title: "Call", description: DESCRIPTION, budgetMin: -1 }],
    [
      "rounds.0.deadlineDate",
      {
        title: "Call",
        description: DESCRIPTION,
        rounds: [{ deadlineDate: "1. april" }],
      },
    ],
    ["", { title: "Call", description: DESCRIPTION, fundingLevel: "eu" }],
  ])("400s on a bad %s", async (path, body) => {
    const res = await api.post("/api/calls").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].path).toBe(path);
  });

  it(`asks for ${MIN_DESCRIPTION_CHARS} characters of description`, async () => {
    const res = await api.post("/api/calls").send({
      title: "Call",
      description: "x".repeat(MIN_DESCRIPTION_CHARS - 1),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/calls/:id (validation)", () => {
  it("rejects a field the edit body does not know", async () => {
    const res = await api.patch("/api/calls/1").send({ fundingLevel: "eu" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an edited round date that is not a date", async () => {
    const res = await api
      .patch("/api/calls/1")
      .send({ rounds: [{ deadlineDate: "1. april" }] });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("rounds.0.deadlineDate");
  });

  it("rejects an edited description too short to score", async () => {
    const res = await api
      .patch("/api/calls/1")
      .send({ description: "Too short." });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("description");
  });
});

describe("PATCH /api/calls/:id/match (validation)", () => {
  it.each([
    [
      "manualScore",
      "an override without a score",
      { reviewStatus: "overridden" },
    ],
    [
      "manualScore",
      "a score on a dismissal",
      { reviewStatus: "dismissed", manualScore: 10 },
    ],
    [
      "manualScore",
      "a score above 100",
      { reviewStatus: "overridden", manualScore: 101 },
    ],
    ["reviewStatus", "an unknown review status", { reviewStatus: "approved" }],
  ])("rejects %s (%s)", async (path, _case, body) => {
    const res = await api.patch("/api/calls/1/match").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe(path);
  });
});

describe("POST /api/calls/:id/score", () => {
  it("503s when AI scoring is not configured", async () => {
    env.GEMINI_API_KEY = undefined;

    const res = await api.post("/api/calls/1/score");

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("SCORING_UNAVAILABLE");
  });
});

describeDb("GET /api/calls (database)", () => {
  it("returns a page of calls in the documented shape", async () => {
    const res = await api.get("/api/calls?limit=5");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body).toMatchObject({ limit: 5, offset: 0 });
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.items.length);

    for (const item of res.body.items) {
      expect(typeof item.id).toBe("number");
      expect(typeof item.title).toBe("string");
      expect(item.source).toBeTruthy();
      expect(item.fitLabel === null).toBe(item.score === null);
      if (item.deadline !== null) expect(item.deadline).toMatch(ISO_DATE);
    }
  });

  it("paginates with offset", async () => {
    const q = token();
    const ids = [
      await insertCall({ title: q }),
      await insertCall({ title: q }),
      await insertCall({ title: q }),
    ];

    const page = await api.get(`/api/calls?q=${q}&limit=2`);
    const next = await api.get(`/api/calls?q=${q}&limit=2&offset=2`);

    expect(page.body).toMatchObject({ total: 3, limit: 2, offset: 0 });
    expect(next.body).toMatchObject({ total: 3, limit: 2, offset: 2 });
    expect(
      [...page.body.items, ...next.body.items].map((i: { id: number }) => i.id),
    ).toEqual(ids);
  });

  it("orders by score, then nearest deadline still ahead, then id", async () => {
    const q = token();
    const ids = {
      unscored: await insertCall({ title: q }),
      low: await insertCall({ title: q }),
      laterDeadline: await insertCall({ title: q }),
      soonerDeadline: await insertCall({ title: q }),
      undated: await insertCall({ title: q }),
    };
    await saveScore(ids.low, 30);
    for (const id of [ids.laterDeadline, ids.soonerDeadline, ids.undated])
      await saveScore(id, 80);
    await db
      .insertInto("funding_round")
      .values([
        { call_id: ids.laterDeadline, deadline_date: "2099-06-01" },
        { call_id: ids.laterDeadline, deadline_date: "2000-01-01" },
        { call_id: ids.soonerDeadline, deadline_date: "2098-06-01" },
      ])
      .execute();

    const res = await api.get(`/api/calls?q=${q}`);

    expect(res.body.items.map((i: { id: number }) => i.id)).toEqual([
      ids.soonerDeadline,
      ids.laterDeadline,
      ids.undated,
      ids.low,
      ids.unscored,
    ]);
    expect(res.body.items[1].deadline).toBe("2099-06-01");
    expect(res.body.items[2].deadline).toBeNull();
  });

  it("searches title, summary, funding body and description", async () => {
    const q = token();
    for (const values of [
      { title: `A ${q} call` },
      { summary: q.toUpperCase() },
      { funding_body: q },
      { description: `... ${q} ...` },
    ])
      await insertCall(values);

    const res = await api.get(`/api/calls?q=${q}`);

    expect(res.body.total).toBe(4);
  });

  it("treats % and _ in a search as plain text", async () => {
    const q = token();
    await insertCall({ title: `${q}-50 kr` });

    const [plain, percent, underscore] = await Promise.all([
      api.get(`/api/calls?q=${q}-50`),
      api.get(`/api/calls?q=${q}%2550`),
      api.get(`/api/calls?q=${q}_50`),
    ]);

    expect([plain, percent, underscore].map((r) => r.body.total)).toEqual([
      1, 0, 0,
    ]);
  });

  it("lists closed calls only when asked, and filters by level", async () => {
    const q = token();
    await insertCall({ title: q, status: "open", level: "municipal" });
    await insertCall({ title: q, status: "closed", level: "eu" });
    const titles = async (query: string) =>
      (await api.get(`/api/calls?q=${q}${query}`)).body.items.map(
        (i: { status: string; level: string }) => `${i.status} ${i.level}`,
      );

    expect(await titles("")).toEqual(["open municipal"]);
    expect(await titles("&status=closed")).toEqual(["closed eu"]);
    expect(await titles("&status=open")).toEqual(["open municipal"]);
    expect(await titles("&level=eu")).toEqual([]);
    expect(await titles("&level=eu&status=closed")).toEqual(["closed eu"]);
  });

  it("hides calls scored 0 and dismissed ones, but still serves them by id", async () => {
    const q = token();
    const ineligible = await insertCall({ title: q });
    const dismissed = await insertCall({ title: q });
    const deleted = await insertCall({ title: q, deleted_at: new Date() });
    const unscored = await insertCall({ title: q });
    await saveScore(ineligible, 0);
    await saveScore(dismissed, 90);
    await db
      .updateTable("match_result")
      .set({ review_status: "dismissed" })
      .where("call_id", "=", dismissed)
      .execute();

    const list = await api.get(`/api/calls?q=${q}`);

    expect(list.body.items.map((i: { id: number }) => i.id)).toEqual([
      unscored,
    ]);
    expect((await api.get(`/api/calls/${ineligible}`)).status).toBe(200);
    expect((await api.get(`/api/calls/${dismissed}`)).status).toBe(200);
    expect((await api.get(`/api/calls/${deleted}`)).status).toBe(404);
  });
});

describeDb("GET /api/calls/:id (database)", () => {
  it("returns one call with its rounds and tags", async () => {
    const theme = await db
      .selectFrom("tag")
      .select(["id", "label"])
      .where("type", "=", "theme")
      .executeTakeFirstOrThrow();
    const id = await insertCall({
      source_url: "https://example.test/call",
      summary: "  ",
      recurring: true,
    });
    await db
      .insertInto("funding_call_tag")
      .values({ call_id: id, tag_id: theme.id })
      .execute();
    await db
      .insertInto("funding_round")
      .values([
        { call_id: id, round_no: 2, deadline_date: "2099-02-01" },
        {
          call_id: id,
          round_no: 1,
          open_date: "2026-01-01",
          deadline_date: "2026-02-01",
        },
      ])
      .execute();

    const res = await api.get(`/api/calls/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      sourceUrl: "https://example.test/call",
      source: "Added by hand",
      summary: null,
      recurring: true,
      status: "unknown",
      currency: "DKK",
      themes: [theme.label],
      targetGroups: [],
      deadline: "2099-02-01",
      score: null,
      fitLabel: null,
      reviewStatus: null,
      reasons: [],
    });
    expect(res.body.rounds.map((r: { roundNo: number }) => r.roundNo)).toEqual([
      1, 2,
    ]);
    expect(res.body.rounds[0]).toEqual({
      roundNo: 1,
      openDate: "2026-01-01",
      deadlineDate: "2026-02-01",
      decisionDate: null,
      expectedNextOpenDate: null,
    });
  });

  it("explains the AI recommendation", async () => {
    const id = await insertCall();
    await saveScore(id, 0, {
      confidence: "medium",
      blockingReason: "Only schools may apply.",
      keyPoints: [
        { kind: "blocker", about: "eligibility", text: "PYN is not a school." },
        { kind: "barrier", about: "complexity", text: "Long form." },
      ],
    });

    const res = await api.get(`/api/calls/${id}`);

    expect(res.body).toMatchObject({
      score: 0,
      aiScore: 0,
      fitLabel: "not_recommended",
      confidence: "medium",
      blockingReason: "Only schools may apply.",
      reviewStatus: "generated",
      reasons: [
        {
          kind: "blocker",
          about: "eligibility",
          message: "PYN is not a school.",
        },
        { kind: "barrier", about: "complexity", message: "Long form." },
      ],
    });
  });

  it("returns a 404 for an id that does not exist", async () => {
    const res = await api.get("/api/calls/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Call not found",
    });
  });
});

describeDb("POST /api/calls (database)", () => {
  async function post(body: object) {
    const res = await api.post("/api/calls").send(body);
    if (res.body.id)
      onTestFinished(async () => {
        await db
          .deleteFrom("funding_call")
          .where("id", "=", res.body.id)
          .execute();
      });
    return res;
  }

  it("adds the call by hand, tags it and scores it before responding", async () => {
    const newTag = token();
    onTestFinished(async () => {
      await db.deleteFrom("tag").where("label", "=", newTag).execute();
    });

    const res = await post({
      title: "  Hand-made call  ",
      description: DESCRIPTION,
      summary: "",
      fundingBody: "Horsens Kommune",
      sourceUrl: null,
      level: "municipal",
      budgetMax: 50000,
      themes: [newTag],
      targetGroups: [newTag],
      rounds: [{ deadlineDate: "2099-01-01" }],
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Hand-made call",
      summary: null,
      source: "Added by hand",
      sourceUrl: null,
      status: "open",
      deadline: "2099-01-01",
      currency: "DKK",
      themes: [newTag],
      targetGroups: [newTag],
      score: 75,
      fitLabel: "strong_fit",
      reasons: [
        { kind: "info", about: "theme_match", message: "A neutral point." },
      ],
    });
    expect(generateJson).toHaveBeenCalledOnce();
    expect(generateJson.mock.calls[0][0]).toContain("Hand-made call");
  });

  it.each([
    ["every deadline has passed", [{ deadlineDate: "2001-01-01" }], "closed"],
    ["no round has a deadline", [{ openDate: "2099-01-01" }], "unknown"],
  ])("derives the status when %s", async (_case, rounds, status) => {
    const res = await post({ title: "Call", description: DESCRIPTION, rounds });

    expect(res.body.status).toBe(status);
  });

  it("keeps a status it is given", async () => {
    const res = await post({
      title: "Call",
      description: DESCRIPTION,
      status: "upcoming",
      rounds: [{ deadlineDate: "2001-01-01" }],
    });

    expect(res.body.status).toBe("upcoming");
  });

  it("still creates the call, unscored, when scoring fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    generateJson.mockRejectedValue(new Error("Gemini is down"));

    const res = await post({ title: "Call", description: DESCRIPTION });

    expect(res.status).toBe(201);
    expect(res.body.score).toBeNull();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("leaves the call unscored when AI scoring is not configured", async () => {
    env.GEMINI_API_KEY = undefined;

    const res = await post({ title: "Call", description: DESCRIPTION });

    expect(res.status).toBe(201);
    expect(res.body.score).toBeNull();
    expect(generateJson).not.toHaveBeenCalled();
  });
});

describeDb("PATCH /api/calls/:id (database)", () => {
  it("edits the call, replaces rounds and tags, and marks it edited", async () => {
    const [theme, group] = await Promise.all([
      db
        .selectFrom("tag")
        .select("label")
        .where("type", "=", "theme")
        .executeTakeFirstOrThrow(),
      db
        .selectFrom("tag")
        .select("label")
        .where("type", "=", "target_group")
        .executeTakeFirstOrThrow(),
    ]);
    const id = await insertCall({ status: "closed" });

    const edited = await api.patch(`/api/calls/${id}`).send({
      title: "Edited call",
      fundingBody: "Horsens Kommune",
      level: "municipal",
      funderType: "public_pool",
      budgetMin: 1000,
      budgetMax: 50000,
      ngoEligible: true,
      recurring: true,
      eligibility: "Associations can apply.",
      themes: [theme.label],
      targetGroups: [group.label],
      rounds: [
        { openDate: "2026-01-01", deadlineDate: "2026-02-01" },
        { deadlineDate: "2099-02-01", expectedNextOpenDate: "2100-01-01" },
      ],
    });
    const partial = await api
      .patch(`/api/calls/${id}`)
      .send({ eligibility: "", targetGroups: [] });
    const stored = await db
      .selectFrom("funding_call")
      .select("edited_at")
      .where("id", "=", id)
      .executeTakeFirstOrThrow();

    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({
      title: "Edited call",
      fundingBody: "Horsens Kommune",
      level: "municipal",
      funderType: "public_pool",
      budgetMin: 1000,
      budgetMax: 50000,
      ngoEligible: true,
      recurring: true,
      eligibility: "Associations can apply.",
      themes: [theme.label],
      targetGroups: [group.label],
      status: "open",
      deadline: "2099-02-01",
    });
    expect(edited.body.rounds).toEqual([
      {
        roundNo: 1,
        openDate: "2026-01-01",
        deadlineDate: "2026-02-01",
        decisionDate: null,
        expectedNextOpenDate: null,
      },
      {
        roundNo: 2,
        openDate: null,
        deadlineDate: "2099-02-01",
        decisionDate: null,
        expectedNextOpenDate: "2100-01-01",
      },
    ]);
    expect(partial.body).toMatchObject({
      eligibility: null,
      fundingBody: "Horsens Kommune",
      themes: [theme.label],
      targetGroups: [],
    });
    expect(partial.body.rounds).toHaveLength(2);
    expect(stored.edited_at).not.toBeNull();
  });

  it("closes the call when every edited deadline has passed, and clears rounds on []", async () => {
    const id = await insertCall({ status: "open" });

    const closed = await api
      .patch(`/api/calls/${id}`)
      .send({ rounds: [{ deadlineDate: "2001-01-01" }] });
    const cleared = await api.patch(`/api/calls/${id}`).send({ rounds: [] });

    expect(closed.body.status).toBe("closed");
    expect(cleared.body.rounds).toEqual([]);
    expect(cleared.body.status).toBe("closed");
  });

  it("does not rescore the call", async () => {
    const id = await insertCall();

    await api.patch(`/api/calls/${id}`).send({ title: "Renamed" });

    expect(generateJson).not.toHaveBeenCalled();
  });

  it.each([
    ["does not exist", async () => 999999999],
    ["was deleted", () => insertCall({ deleted_at: new Date() })],
  ])("returns a 404 for a call that %s", async (_case, makeId) => {
    const res = await api
      .patch(`/api/calls/${await makeId()}`)
      .send({ recurring: true });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describeDb("POST /api/calls/:id/score (database)", () => {
  it("rescores the call with the AI now", async () => {
    const id = await insertCall({ description: DESCRIPTION });
    await saveScore(id, 10);
    generateJson.mockResolvedValue(modelOutput(2));

    const res = await api.post(`/api/calls/${id}/score`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, score: 50, fitLabel: "possible_fit" });
  });

  it("returns a 404 for an id that does not exist", async () => {
    const res = await api.post("/api/calls/999999999/score");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(generateJson).not.toHaveBeenCalled();
  });
});

describeDb("PATCH /api/calls/:id/match (database)", () => {
  it("overrides, dismisses and restores the recommendation", async () => {
    const q = token();
    const id = await insertCall({ title: q });
    await saveScore(id, 82);
    const review = (body: object) =>
      api.patch(`/api/calls/${id}/match`).send(body);
    const listed = async () => (await api.get(`/api/calls?q=${q}`)).body.total;

    const overridden = await review({
      reviewStatus: "overridden",
      manualScore: 10,
      adminNote: "Wrong",
    });
    const stillListed = await listed();
    const dismissed = await review({ reviewStatus: "dismissed" });
    const hidden = await listed();
    const restored = await review({ reviewStatus: "generated" });
    const back = await listed();

    expect(overridden.status).toBe(200);
    expect(overridden.body).toMatchObject({
      reviewStatus: "overridden",
      score: 10,
      fitLabel: "not_recommended",
      aiScore: 82,
      adminNote: "Wrong",
    });
    expect(stillListed).toBe(1);
    expect(dismissed.body).toMatchObject({
      reviewStatus: "dismissed",
      adminNote: "Wrong",
    });
    expect(hidden).toBe(0);
    expect(restored.body).toMatchObject({
      reviewStatus: "generated",
      score: 82,
      fitLabel: "strong_fit",
      adminNote: null,
    });
    expect(back).toBe(1);
  });

  it("hides a call overridden to 0", async () => {
    const q = token();
    const id = await insertCall({ title: q });
    await saveScore(id, 82);

    await api
      .patch(`/api/calls/${id}/match`)
      .send({ reviewStatus: "overridden", manualScore: 0 });

    expect((await api.get(`/api/calls?q=${q}`)).body.total).toBe(0);
  });

  it("returns a 404 for a call that is not scored yet", async () => {
    const id = await insertCall();

    const res = await api
      .patch(`/api/calls/${id}/match`)
      .send({ reviewStatus: "dismissed" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Call not found or not scored yet");
  });

  it("returns a 404 for a deleted call", async () => {
    const id = await insertCall({ deleted_at: new Date() });
    await saveScore(id, 50);

    const res = await api
      .patch(`/api/calls/${id}/match`)
      .send({ reviewStatus: "dismissed" });

    expect(res.status).toBe(404);
  });
});

describeDb("DELETE /api/calls/:id (database)", () => {
  it("hides the call, and the scraper's upsert does not bring it back", async () => {
    const sourceUrl = `https://example.test/delete-${token()}`;
    const id = await insertCall({ source_url: sourceUrl });
    const { funding_source_id } = await db
      .selectFrom("funding_call")
      .select("funding_source_id")
      .where("id", "=", id)
      .executeTakeFirstOrThrow();

    const deleted = await api.delete(`/api/calls/${id}`);
    const fetched = await api.get(`/api/calls/${id}`);
    const again = await api.delete(`/api/calls/${id}`);
    await db
      .insertInto("funding_call")
      .values({ funding_source_id, source_url: sourceUrl, title: "Rescraped" })
      .onConflict((oc) =>
        oc
          .columns(["funding_source_id", "source_url"])
          .doUpdateSet((eb) => ({ title: eb.ref("excluded.title") })),
      )
      .execute();
    const rescraped = await api.get(`/api/calls/${id}`);

    expect(deleted.status).toBe(204);
    expect(fetched.status).toBe(404);
    expect(again.status).toBe(404);
    expect(rescraped.status).toBe(404);
  });

  it("returns a 404 for an id that does not exist", async () => {
    const res = await api.delete("/api/calls/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
