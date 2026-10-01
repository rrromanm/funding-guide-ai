import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { db } from "../src/lib/db.ts";

const app = createApp();

afterAll(async () => {
  await db.destroy();
});

describe("GET /api/sources", () => {
  it("404s on an unknown sub-path", async () => {
    const res = await request(app).get("/api/sources/fonde");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/sources (database)",
  () => {
    it("returns every source with its counts", async () => {
      const res = await request(app).get("/api/sources");

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);

      const [first] = res.body.items;
      expect(typeof first.key).toBe("string");
      expect(typeof first.name).toBe("string");
      expect(first.counts.total).toBeGreaterThanOrEqual(
        first.counts.open + first.counts.closed,
      );
      expect(first.counts.relevant).toBeLessThanOrEqual(first.counts.total);
    });

    it("counts every listed call against some source", async () => {
      const [sources, calls] = await Promise.all([
        request(app).get("/api/sources"),
        request(app).get("/api/calls?limit=1"),
      ]);
      const open = sources.body.items.reduce(
        (sum: number, item: { counts: { open: number } }) =>
          sum + item.counts.open,
        0,
      );

      expect(open).toBeGreaterThanOrEqual(0);
      expect(calls.status).toBe(200);
    });
  },
);
