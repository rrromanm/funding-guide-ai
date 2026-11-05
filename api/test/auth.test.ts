import { describe, expect, it } from "vitest";
import { generateKeyPair } from "jose";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { adminApi, signToken } from "./auth.ts";

const app = createApp();

describe("/api auth", () => {
  it("401s without a token", async () => {
    const res = await request(app).get("/api/calls/abc");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("401s on a token signed by another key", async () => {
    const { privateKey } = await generateKeyPair("ES256");
    const token = await signToken(
      { app_metadata: { role: "admin" } },
      privateKey,
    );
    const res = await request(app)
      .get("/api/calls/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid or expired token");
  });

  it("401s on an expired token", async () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const token = await signToken({ app_metadata: { role: "admin" }, exp });
    const res = await request(app)
      .get("/api/calls/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it("403s on a signed-in user who is not an admin", async () => {
    const token = await signToken({ app_metadata: {} });
    const res = await request(app)
      .get("/api/calls/abc")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets an admin through", async () => {
    const res = await adminApi().get("/api/calls/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("leaves /health public", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});
