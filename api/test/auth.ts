import { generateKeyPair, SignJWT, type JWTPayload } from "jose";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { env } from "../src/config/env.ts";

export const { publicKey, privateKey } = await generateKeyPair("ES256");

export function signToken(
  claims: JWTPayload = { app_metadata: { role: "admin" } },
  key: CryptoKey = privateKey,
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer(new URL("/auth/v1", env.SUPABASE_URL).href)
    .setAudience("authenticated")
    .setExpirationTime(claims.exp ?? "5m")
    .sign(key);
}

const adminToken = await signToken();
export function adminApi() {
  return request
    .agent(createApp())
    .set("Authorization", `Bearer ${adminToken}`);
}
