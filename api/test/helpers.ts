import { describe, onTestFinished } from "vitest";
import { generateKeyPair, SignJWT, type JWTPayload } from "jose";
import type { Insertable } from "kysely";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { env } from "../src/config/env.ts";
import { db } from "../src/lib/db.ts";
import type { FundingCall } from "../src/lib/db-types.ts";
import { WEIGHTS } from "../src/modules/matches/matches.config.ts";
import type {
  JudgeOutput,
  ScoredResult,
} from "../src/modules/matches/matches.schema.ts";
import { labelFor } from "../src/modules/matches/matches.scoring.ts";
import { saveResult } from "../src/modules/matches/matches.service.ts";

export const { publicKey, privateKey } = await generateKeyPair("ES256");

export function signToken(
  claims: JWTPayload = { app_metadata: { role: "admin" } },
  key: CryptoKey = privateKey,
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer(claims.iss ?? new URL("/auth/v1", env.SUPABASE_URL).href)
    .setAudience(claims.aud ?? "authenticated")
    .setExpirationTime(claims.exp ?? "5m")
    .sign(key);
}

const adminToken = await signToken();
export function adminApi() {
  return request
    .agent(createApp())
    .set("Authorization", `Bearer ${adminToken}`);
}

export const describeDb = describe.skipIf(!process.env.DATABASE_URL);

export async function insertCall(
  values: Partial<Insertable<FundingCall>> = {},
) {
  const source = await db
    .selectFrom("funding_source")
    .select("id")
    .where("source_type", "=", "manual")
    .executeTakeFirstOrThrow();
  const { id } = await db
    .insertInto("funding_call")
    .values({ funding_source_id: source.id, title: "Test call", ...values })
    .returning("id")
    .executeTakeFirstOrThrow();
  onTestFinished(async () => {
    await db.deleteFrom("funding_call").where("id", "=", id).execute();
  });
  return id;
}

export function scoredResult(
  score: number,
  overrides: Partial<ScoredResult> = {},
): ScoredResult {
  return {
    score,
    fitLabel: labelFor(score),
    confidence: "high",
    blockingReason: null,
    warnings: [],
    criteria: [],
    eligibility: [],
    droppedCriteria: [],
    keyPoints: [],
    ...overrides,
  };
}

export function saveScore(
  callId: number,
  score: number,
  overrides: Partial<ScoredResult> = {},
) {
  return saveResult(
    { id: callId, title: "Test call", text: "", missingData: [] },
    "test-model",
    {},
    scoredResult(score, overrides),
  );
}

export function modelOutput(
  rating: number,
  overrides: Partial<JudgeOutput> = {},
): JudgeOutput {
  const criteria = Object.fromEntries(
    Object.keys(WEIGHTS).map((key) => [
      key,
      { rating, evidence: null, reason: `Rated ${rating}.` },
    ]),
  ) as JudgeOutput["criteria"];

  return {
    eligibility: [],
    criteria,
    key_points: [
      { kind: "info", about: "theme_match", text: "A neutral point." },
    ],
    ...overrides,
  };
}
