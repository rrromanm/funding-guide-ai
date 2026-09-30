import { afterAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { db } from "../src/lib/db.ts";

describe.skipIf(!process.env.DATABASE_URL)("db", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("connects", async () => {
    const result = await sql<{ one: number }>`select 1 as one`.execute(db);
    expect(result.rows[0]?.one).toBe(1);
  });

  it("reads funding_call with numeric ids and completeness", async () => {
    const row = await db
      .selectFrom("funding_call")
      .select(["id", "completeness"])
      .where("completeness", "is not", null)
      .limit(1)
      .executeTakeFirstOrThrow();

    expect(typeof row.id).toBe("number");
    expect(typeof row.completeness).toBe("number");
  });
});
