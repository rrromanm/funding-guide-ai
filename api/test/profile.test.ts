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
