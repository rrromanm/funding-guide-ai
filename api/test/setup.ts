import { vi } from "vitest";

vi.mock("jose", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jose")>()),
  createRemoteJWKSet: () => async () => (await import("./auth.ts")).publicKey,
}));
