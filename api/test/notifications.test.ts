import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { adminApi } from "./auth.ts";
import { db } from "../src/lib/db.ts";
import type { ScoredResult } from "../src/modules/matches/matches.schema.ts";
import { saveResult } from "../src/modules/matches/matches.service.ts";
import { notificationListResponse } from "../src/modules/notifications/notifications.schema.ts";
import { notifyNewCalls } from "../src/modules/notifications/notifications.service.ts";

const api = adminApi();

afterAll(async () => {
  await db.destroy();
});

describe("GET /api/notifications", () => {
  it("404s on an unknown sub-path", async () => {
    const res = await api.get("/api/notifications/1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/notifications/:id", () => {
  it("rejects a body without a boolean read", async () => {
    const res = await api.patch("/api/notifications/1").send({ read: "yes" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects fields it does not know", async () => {
    const res = await api
      .patch("/api/notifications/1")
      .send({ read: true, message: "edited" });

    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric id", async () => {
    const res = await api.patch("/api/notifications/abc").send({ read: true });

    expect(res.status).toBe(400);
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/notifications (database)",
  () => {
    it("returns the documented shape, newest first", async () => {
      const res = await api.get("/api/notifications");

      expect(res.status).toBe(200);
      expect(notificationListResponse.parse(res.body)).toBeTruthy();

      const dates = res.body.items.map(
        (item: { createdAt: string }) => item.createdAt,
      );
      expect([...dates].sort().reverse()).toEqual(dates);
    });
  },
);

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/notifications/:id (database)",
  () => {
    it("404s on an unknown notification", async () => {
      const res = await api
        .patch("/api/notifications/999999999")
        .send({ read: true });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("marks a notification read, and back to unread", async () => {
      const written = await db
        .insertInto("notification")
        .values({ message: "Test notification" })
        .returning("id")
        .executeTakeFirstOrThrow();
      onTestFinished(async () => {
        await db
          .deleteFrom("notification")
          .where("id", "=", written.id)
          .execute();
      });

      const read = await api
        .patch(`/api/notifications/${written.id}`)
        .send({ read: true });
      const stored = await db
        .selectFrom("notification")
        .select("read")
        .where("id", "=", written.id)
        .executeTakeFirstOrThrow();
      const unread = await api
        .patch(`/api/notifications/${written.id}`)
        .send({ read: false });

      expect(read.status).toBe(200);
      expect(read.body).toMatchObject({ id: written.id, read: true });
      expect(stored.read).toBe(true);
      expect(unread.body.read).toBe(false);
    });
  },
);

describe.skipIf(!process.env.DATABASE_URL)("scoring (database)", () => {
  const result: ScoredResult = {
    score: 82,
    fitLabel: "strong_fit",
    confidence: "high",
    blockingReason: null,
    warnings: [],
    criteria: [],
    eligibility: [],
    droppedCriteria: [],
    keyPoints: [],
  };

  it("reports a call's first score as new, and a re-score as not", async () => {
    const source = await db
      .selectFrom("funding_source")
      .select("id")
      .executeTakeFirstOrThrow();
    const { id } = await db
      .insertInto("funding_call")
      .values({
        funding_source_id: source.id,
        source_url: `https://example.test/notify-${Date.now()}`,
        title: "Test call",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    onTestFinished(async () => {
      await db.deleteFrom("funding_call").where("id", "=", id).execute();
    });

    const call = { id, title: "Test call", text: "", missingData: [] };
    const first = await saveResult(call, "test-model", {}, result);
    const again = await saveResult(call, "test-model", {}, result);

    expect([first, again]).toEqual([true, false]);
  });

  it("stores how many new calls a run found and how many are relevant", async () => {
    await notifyNewCalls(3, 1);
    const row = await db
      .selectFrom("notification")
      .select(["id", "message"])
      .orderBy("id", "desc")
      .executeTakeFirstOrThrow();
    await db.deleteFrom("notification").where("id", "=", row.id).execute();

    expect(row.message).toBe("Found 3 new calls, 1 relevant.");
  });
});
