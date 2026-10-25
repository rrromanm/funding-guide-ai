import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { db } from "../src/lib/db.ts";
import { profileResponse } from "../src/modules/profile/profile.schema.ts";

const app = createApp();

afterAll(async () => {
  await db.destroy();
});

describe("GET /api/profile", () => {
  it("404s on a sub-path, because the profile is a singleton", async () => {
    const res = await request(app).get("/api/profile/1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/profile", () => {
  it.each([
    ["a fixed field", { name: "Someone else" }],
    ["the founded year", { foundedYear: 2000 }],
    ["an unknown field", { staff: 3 }],
    ["a negative staff count", { staffCount: -1 }],
    ["an empty tag", { themes: [" "] }],
  ])("400s on %s", async (_case, body) => {
    const res = await request(app).patch("/api/profile").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "PATCH /api/profile (database)",
  () => {
    it("updates the given fields, replaces tags and leaves the rest alone", async () => {
      const { body: original } = await request(app).get("/api/profile");
      const { name, legalStatus, city, country, foundedYear, id, ...editable } =
        original;

      const res = await request(app)
        .patch("/api/profile")
        .send({
          staffCount: original.staffCount + 1,
          adminCapacity: "  ",
          themes: original.themes.slice(0, 1),
        });

      const restored = await request(app).patch("/api/profile").send(editable);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name,
        city,
        staffCount: original.staffCount + 1,
        adminCapacity: null,
        themes: original.themes.slice(0, 1),
        targetGroups: original.targetGroups,
        foundedYear,
      });
      expect(restored.body).toEqual(original);
    });
  },
);

describe.skipIf(!process.env.DATABASE_URL)(
  "GET /api/profile (database)",
  () => {
    it("returns the one profile in the documented shape", async () => {
      const res = await request(app).get("/api/profile");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(profileResponse.parse(res.body)).toBeTruthy();
    });

    it("reads themes and target groups off the profile's tags", async () => {
      const [res, tags] = await Promise.all([
        request(app).get("/api/profile"),
        db
          .selectFrom("org_profile_tag")
          .innerJoin("tag", "tag.id", "org_profile_tag.tag_id")
          .select(["tag.label", "tag.type"])
          .where("org_profile_tag.org_profile_id", "=", 1)
          .execute(),
      ]);

      const expected = (type: string) =>
        tags
          .filter((tag) => tag.type === type)
          .map((tag) => tag.label)
          .sort();

      expect([...res.body.themes].sort()).toEqual(expected("theme"));
      expect([...res.body.targetGroups].sort()).toEqual(
        expected("target_group"),
      );
    });
  },
);
