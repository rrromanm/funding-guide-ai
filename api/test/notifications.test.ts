import { describe, expect, it, onTestFinished } from "vitest";
import { db } from "../src/lib/db.ts";
import { notificationListResponse } from "../src/modules/notifications/notifications.schema.ts";
import { notifyNewCalls } from "../src/modules/notifications/notifications.service.ts";
import { adminApi, describeDb } from "./helpers.ts";

const api = adminApi();

async function insertNotification(message = "Test notification") {
  const { id } = await db
    .insertInto("notification")
    .values({ message })
    .returning("id")
    .executeTakeFirstOrThrow();
  onTestFinished(async () => {
    await db.deleteFrom("notification").where("id", "=", id).execute();
  });
  return id;
}

async function lastId() {
  const { id } = await db
    .selectFrom("notification")
    .select((eb) => eb.fn.max("id").as("id"))
    .executeTakeFirstOrThrow();
  return id ?? 0;
}

async function takeNotifications(since: number, messages: string[]) {
  const rows = await db
    .deleteFrom("notification")
    .where("id", ">", since)
    .where("message", "in", messages)
    .returning("message")
    .execute();
  return rows.map((row) => row.message).sort();
}

describe("GET /api/notifications", () => {
  it("404s on an unknown sub-path", async () => {
    const res = await api.get("/api/notifications/1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
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
    const id = await insertNotification();

    const res = await api.get("/api/notifications");

    expect(res.status).toBe(200);
    expect(notificationListResponse.parse(res.body)).toBeTruthy();
    expect(
      res.body.items.find((item: { id: number }) => item.id === id),
    ).toMatchObject({ message: "Test notification", read: false });

    const dates = res.body.items.map(
      (item: { createdAt: string }) => item.createdAt,
    );
    expect([...dates].sort().reverse()).toEqual(dates);
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
    const id = await insertNotification();

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

describeDb("notifyNewCalls (database)", () => {
  it("stores how many new calls a run found and how many are relevant", async () => {
    const since = await lastId();

    await notifyNewCalls(3, 1);
    await notifyNewCalls(1, 0);

    expect(
      await takeNotifications(since, [
        "Found 3 new calls, 1 relevant.",
        "Found 1 new call, 0 relevant.",
      ]),
    ).toEqual([
      "Found 1 new call, 0 relevant.",
      "Found 3 new calls, 1 relevant.",
    ]);
  });

  it("stores nothing when a run found no new calls", async () => {
    const since = await lastId();

    await notifyNewCalls(0, 0);

    expect(
      await takeNotifications(since, ["Found 0 new calls, 0 relevant."]),
    ).toEqual([]);
  });
});
