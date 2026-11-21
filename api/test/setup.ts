import { afterAll, vi } from "vitest";
import { db } from "../src/lib/db.ts";

vi.mock("jose", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jose")>()),
  createRemoteJWKSet: () => async () =>
    (await import("./helpers.ts")).publicKey,
}));

afterAll(async () => {
  await db.destroy();
});
