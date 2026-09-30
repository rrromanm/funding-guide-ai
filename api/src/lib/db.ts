import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { env } from "../config/env.ts";
import type { DB } from "./db-types.ts";

pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1700, Number);

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({ connectionString: env.DATABASE_URL }),
  }),
});
