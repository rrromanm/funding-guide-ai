import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";

type QueryResult = { rows: Record<string, unknown>[] };
type Pool = {
  query: (sql: string, values?: unknown[]) => Promise<QueryResult>;
  end: () => Promise<void>;
};
const requireApiDependency = createRequire(resolve(__dirname, "../../api/package.json"));

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for isolated mutation tests.`);
  return value;
}

export async function withIsolatedDatabase<T>(callback: (pool: Pool) => Promise<T>): Promise<T> {
  if (process.env.E2E_MUTATION_TESTS !== "1") throw new Error("Mutation tests must be explicitly enabled.");
  const project = required("E2E_TEST_PROJECT_ID");
  if (!/^[a-z0-9][a-z0-9-]+$/.test(project)) throw new Error("Invalid isolated project ID.");
  const database = new URL(required("E2E_TEST_DATABASE_URL"));
  const auth = new URL(required("E2E_TEST_SUPABASE_URL"));
  if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.port !== "55422" ||
      database.pathname !== "/postgres" || !["localhost", "127.0.0.1"].includes(auth.hostname) ||
      auth.port !== "55421" || process.env.NEXT_PUBLIC_SUPABASE_URL !== auth.origin) {
    throw new Error("Database, auth, and frontend URLs must match the dedicated local stack.");
  }
  const inspect = (service: string) => {
    const raw = execFileSync("docker", [
      "inspect", `supabase_${service}_${project}`,
      "--format", "{{json .}}",
    ], { encoding: "utf8" });
    const container = JSON.parse(raw) as {
      State: { Running: boolean };
      Config: { Labels: Record<string, string> };
      NetworkSettings: { Networks: Record<string, unknown>; Ports: Record<string, { HostPort: string }[] | null> };
    };
    if (!container.State.Running || container.Config.Labels["com.supabase.cli.project"] !== project ||
        !container.Config.Labels["com.supabase.cli.workdir"]?.startsWith("/tmp/") ||
        !container.NetworkSettings.Networks[`supabase_network_${project}`]) {
      throw new Error(`Container ${service} is not part of the dedicated temporary test project.`);
    }
    return container;
  };
  const db = inspect("db");
  inspect("auth");
  const kong = inspect("kong");
  if (db.NetworkSettings.Ports["5432/tcp"]?.[0]?.HostPort !== "55422" ||
      kong.NetworkSettings.Ports["8000/tcp"]?.[0]?.HostPort !== "55421") {
    throw new Error("Test container ports do not match the configured stack.");
  }
  const { Pool: PgPool } = requireApiDependency("pg") as {
    Pool: new (config: { connectionString: string }) => Pool;
  };
  const pool = new PgPool({ connectionString: database.toString() });
  try {
    const marker = await pool.query("SELECT marker FROM public.e2e_isolation_marker WHERE marker = $1", [required("E2E_ISOLATION_MARKER")]);
    if (marker.rows.length !== 1) throw new Error("The isolated database marker was not found.");
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

export async function verifyIsolatedSession(page: Page, authorization: string): Promise<void> {
  const response = await page.request.get(`${required("E2E_TEST_SUPABASE_URL")}/auth/v1/user`, {
    headers: { authorization, apikey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
  });
  expect(response.ok(), "session must belong to the isolated auth service").toBeTruthy();
  const user = await response.json() as { id?: unknown };
  if (typeof user.id !== "string") throw new Error("Isolated authentication returned no user ID.");
  await withIsolatedDatabase(async (pool) => {
    const result = await pool.query("SELECT id FROM auth.users WHERE id = $1", [user.id]);
    if (result.rows.length !== 1) throw new Error("Authenticated user is not in the isolated database.");
  });
}
