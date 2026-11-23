import { describe, expect, it } from "vitest";
import { db } from "../src/lib/db.ts";
import {
  notificationDetail,
  notificationListResponse,
} from "../src/modules/notifications/notifications.schema.ts";
import { notifyRelevantCalls } from "../src/modules/notifications/notifications.service.ts";
import {
  adminApi,
  describeDb,
  insertCall,
  notificationsFor,
  saveScore,
} from "./helpers.ts";

const api = adminApi();

async function insertNotification(scores = [80]) {
  const callIds: number[] = [];
  for (const score of scores) {
    const callId = await insertCall({ title: `zztest notified ${score}` });
    await saveScore(callId, score);
    callIds.push(callId);
  }
  await notifyRelevantCalls(callIds);
  const [{ id }] = await notificationsFor(callIds[0]);
  return { id, callIds };
}

describe("GET /api/notifications/:id", () => {
  it("400s on a non-numeric id", async () => {
    const res = await api.get("/api/notifications/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/notifications/:id", () => {
  it.each([
    ["a read that is not a boolean", "/api/notifications/1", { read: "yes" }],
    ["a missing read", "/api/notifications/1", {}],
    [
      "a field it does not know",
      "/api/notifications/1",
      { read: true, message: "edited" },
    ],
    ["a non-numeric id", "/api/notifications/abc", { read: true }],
  ])("400s on %s", async (_case, path, body) => {
    const res = await api.patch(path).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describeDb("GET /api/notifications (database)", () => {
  it("returns the documented shape, newest first", async () => {
    const { id } = await insertNotification([80, 60]);

    const res = await api.get("/api/notifications");

    expect(res.status).toBe(200);
    expect(notificationListResponse.parse(res.body)).toBeTruthy();
    expect(
      res.body.items.find((item: { id: number }) => item.id === id),
    ).toMatchObject({ message: "Found 2 new relevant calls.", read: false });

    const dates = res.body.items.map(
      (item: { createdAt: string }) => item.createdAt,
    );
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describeDb("GET /api/notifications/:id (database)", () => {
  it("returns the notification with its calls, best score first", async () => {
    const {
      id,
      callIds: [best, other],
    } = await insertNotification([80, 60]);

    const res = await api.get(`/api/notifications/${id}`);

    expect(res.status).toBe(200);
    expect(notificationDetail.parse(res.body)).toBeTruthy();
    expect(res.body).toMatchObject({
      id,
      message: "Found 2 new relevant calls.",
      read: false,
    });
    expect(res.body.fundingOpportunities).toMatchObject([
      { id: best, title: "zztest notified 80", score: 80 },
      { id: other, title: "zztest notified 60", score: 60 },
    ]);
  });

  it("leaves out deleted calls", async () => {
    const {
      id,
      callIds: [deleted, kept],
    } = await insertNotification([80, 60]);
    await db
      .updateTable("funding_call")
      .set({ deleted_at: new Date() })
      .where("id", "=", deleted)
      .execute();

    const res = await api.get(`/api/notifications/${id}`);

    expect(
      res.body.fundingOpportunities.map((call: { id: number }) => call.id),
    ).toEqual([kept]);
  });

  it("404s on an unknown notification", async () => {
    const res = await api.get("/api/notifications/999999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describeDb("PATCH /api/notifications/:id (database)", () => {
  it("404s on an unknown notification", async () => {
    const res = await api
      .patch("/api/notifications/999999999")
      .send({ read: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Notification not found",
    });
  });

  it("marks a notification read, and back to unread", async () => {
    const { id } = await insertNotification();

    const read = await api
      .patch(`/api/notifications/${id}`)
      .send({ read: true });
    const stored = await db
      .selectFrom("notification")
      .select("read")
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    const unread = await api
      .patch(`/api/notifications/${id}`)
      .send({ read: false });

    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ id, read: true });
    expect(stored.read).toBe(true);
    expect(unread.body.read).toBe(false);
  });
});

describeDb("POST /api/notifications/read-all (database)", () => {
  it("marks every unread notification read", async () => {
    const { id } = await insertNotification();
    const othersUnread = await db
      .selectFrom("notification")
      .select("id")
      .where("read", "=", false)
      .where("id", "!=", id)
      .execute();

    const res = await api.post("/api/notifications/read-all");
    const stored = await db
      .selectFrom("notification")
      .select("read")
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    if (othersUnread.length > 0) {
      await db
        .updateTable("notification")
        .set({ read: false })
        .where(
          "id",
          "in",
          othersUnread.map((row) => row.id),
        )
        .execute();
    }

    expect(res.status).toBe(200);
    expect(res.body.updated).toBeGreaterThanOrEqual(1);
    expect(stored.read).toBe(true);
  });
});
