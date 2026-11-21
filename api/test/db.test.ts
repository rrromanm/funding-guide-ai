import { expect, it } from "vitest";
import { sql } from "kysely";
import { db } from "../src/lib/db.ts";
import { describeDb } from "./helpers.ts";

describeDb("db", () => {
  it("connects", async () => {
    const result = await sql<{ one: number }>`select 1 as one`.execute(db);
    expect(result.rows[0]?.one).toBe(1);
  });

  it("reads int8 and numeric as numbers, and dates as plain strings", async () => {
    const { rows } = await sql<{ big: unknown; amount: unknown; day: unknown }>`
      select 9007199254740991::int8 as big, 12.5::numeric as amount, '2026-03-01'::date as day
    `.execute(db);

    expect(rows[0]).toEqual({
      big: 9007199254740991,
      amount: 12.5,
      day: "2026-03-01",
    });
  });
});
