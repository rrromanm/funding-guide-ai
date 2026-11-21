import { describe, expect, it } from "vitest";
import { generateKeyPair } from "jose";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { env } from "../src/config/env.ts";
import { adminApi, signToken } from "./helpers.ts";

const app = createApp();

function withToken(token: string) {
  return request(app).get("/api/calls/abc").set("Authorization", token);
}

describe("requireAdmin on /api", () => {
  it("401s without a token", async () => {
    const res = await request(app).get("/api/calls/abc");

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  });

  it("401s on a scheme other than Bearer", async () => {
    const res = await withToken(`Basic ${await signToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Authentication required");
  });

  it("401s on a token signed by another key", async () => {
    const { privateKey } = await generateKeyPair("ES256");
    const token = await signToken(
      { app_metadata: { role: "admin" } },
      privateKey,
    );
    const res = await withToken(`Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid or expired token");
  });

  it.each([
    ["an expired token", { exp: Math.floor(Date.now() / 1000) - 60 }],
    ["another issuer", { iss: "https://evil.supabase.co/auth/v1" }],
    ["another audience", { aud: "anon" }],
  ])("401s on %s", async (_case, claims) => {
    const token = await signToken({
      app_metadata: { role: "admin" },
      ...claims,
    });
    const res = await withToken(`Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("401s on a token that is not a JWT", async () => {
    const res = await withToken("Bearer not-a-jwt");

    expect(res.status).toBe(401);
  });

  it("403s on a signed-in user who is not an admin", async () => {
    const res = await withToken(
      `Bearer ${await signToken({ app_metadata: {} })}`,
    );

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("403s on a role in user_metadata, which users can edit themselves", async () => {
    const token = await signToken({ user_metadata: { role: "admin" } });
    const res = await withToken(`Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("lets an admin through", async () => {
    const res = await adminApi().get("/api/calls/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts a lower-case bearer scheme", async () => {
    const res = await withToken(`bearer ${await signToken()}`);

    expect(res.status).toBe(400);
  });

  it("answers a CORS preflight without a token", async () => {
    const res = await request(app)
      .options("/api/calls")
      .set("Origin", env.CORS_ORIGIN)
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(env.CORS_ORIGIN);
  });

  it("leaves /health public", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});
