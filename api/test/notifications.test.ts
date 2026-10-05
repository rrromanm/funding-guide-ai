import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { db } from "../src/lib/db.ts";
import { notificationListResponse } from "../src/modules/notifications/notifications.schema.ts";

const app = createApp();

afterAll(async () => {
  await db.destroy();
});

describe("GET /api/notifications", () => {
  it("404s on an unknown sub-path", async () => {
    const res = await request(app).get("/api/notifications/1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/notifications (database)",
  () => {
    it("returns the documented shape, newest first", async () => {
      const res = await request(app).get("/api/notifications");

      expect(res.status).toBe(200);
      expect(notificationListResponse.parse(res.body)).toBeTruthy();

      const dates = res.body.items.map(
        (item: { createdAt: string }) => item.createdAt,
      );
      expect([...dates].sort().reverse()).toEqual(dates);
    });

    it("carries the call a notification is about, and hides dismissed ones", async () => {
      const match = await db
        .selectFrom("match_result")
        .select(["id", "call_id", "review_status"])
        .where("review_status", "=", "generated")
        .executeTakeFirst();

      if (!match) return;

      const written = await db
        .insertInto("notification")
        .values({ match_id: match.id, message: "Test notification" })
        .returning("id")
        .executeTakeFirstOrThrow();

      try {
        const listed = await request(app).get("/api/notifications");
        const mine = listed.body.items.find(
          (item: { id: number }) => item.id === written.id,
        );

        await db
          .updateTable("match_result")
          .set({ review_status: "dismissed" })
          .where("id", "=", match.id)
          .execute();
        const afterDismiss = await request(app).get("/api/notifications");

        await db
          .updateTable("match_result")
          .set({ review_status: match.review_status })
          .where("id", "=", match.id)
          .execute();

        expect(mine).toMatchObject({
          callId: match.call_id,
          message: "Test notification",
          read: false,
        });
        expect(typeof mine.callTitle).toBe("string");
        expect(
          afterDismiss.body.items.some(
            (item: { id: number }) => item.id === written.id,
          ),
        ).toBe(false);
      } finally {
        await db
          .deleteFrom("notification")
          .where("id", "=", written.id)
          .execute();
      }
    });
  },
);
