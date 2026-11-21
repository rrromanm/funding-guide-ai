import { describe, expect, it, vi } from "vitest";
import express, { type Router } from "express";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { BadRequestError } from "../src/errors.ts";
import { errorHandler } from "../src/middleware/error-handler.ts";
import { callsRouter } from "../src/modules/calls/calls.router.ts";
import { notificationsRouter } from "../src/modules/notifications/notifications.router.ts";
import { profileRouter } from "../src/modules/profile/profile.router.ts";
import { sourcesRouter } from "../src/modules/sources/sources.router.ts";
import { adminApi } from "./helpers.ts";

const app = createApp();

describe("GET /health", () => {
  it("returns ok with uptime, behind helmet's headers", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("GET /docs", () => {
  it("serves Swagger UI without a token", async () => {
    const res = await request(app).get("/docs/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});

describe("GET /openapi.json", () => {
  it("serves the OpenAPI spec", async () => {
    const res = await request(app).get("/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.1/);
    expect(res.body.paths).toHaveProperty("/health");
  });

  it("documents the calls query from the zod schema", async () => {
    const res = await request(app).get("/openapi.json");
    const list = res.body.paths["/api/calls"].get;

    expect(list.parameters.map((p: { name: string }) => p.name)).toEqual([
      "q",
      "status",
      "level",
      "limit",
      "offset",
    ]);
    expect(
      list.responses["200"].content["application/json"].schema.properties.items,
    ).toBeDefined();
  });

  it("documents every route the routers serve", async () => {
    const mounted: [string, Router][] = [
      ["/api/calls", callsRouter],
      ["/api/notifications", notificationsRouter],
      ["/api/profile", profileRouter],
      ["/api/sources", sourcesRouter],
    ];
    const routes = mounted.flatMap(([prefix, router]) =>
      router.stack.flatMap(({ route }) =>
        route
          ? Object.keys((route as unknown as { methods: object }).methods).map(
              (method) =>
                `${method} ${(prefix + route.path).replace(/\/$/, "").replace(/:(\w+)/g, "{$1}")}`,
            )
          : [],
      ),
    );

    const { body } = await request(app).get("/openapi.json");
    const documented = Object.entries(body.paths).flatMap(([path, ops]) =>
      Object.keys(ops as object).map((method) => `${method} ${path}`),
    );

    expect(routes.length).toBeGreaterThan(10);
    expect(documented).toEqual(expect.arrayContaining(routes));
  });
});

describe("errors", () => {
  it("answers an unknown route with a JSON 404 in the standard shape", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toContain("/does-not-exist");
  });

  it("answers a malformed JSON body with INVALID_JSON", async () => {
    const res = await adminApi()
      .post("/api/calls")
      .set("Content-Type", "application/json")
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: "INVALID_JSON",
      message: "Malformed JSON body",
    });
  });

  const failing = express()
    .get("/bad-request", () => {
      throw new BadRequestError("Nope", [{ path: "x", message: "bad" }]);
    })
    .get("/bug", () => {
      throw new Error("connection string with a password");
    })
    .use(errorHandler);

  it("passes an HttpError's status, code and details through", async () => {
    const res = await request(failing).get("/bad-request");

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: "BAD_REQUEST",
      message: "Nope",
      details: [{ path: "x", message: "bad" }],
    });
  });

  it("logs anything else and answers 500 without leaking it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(failing).get("/bug");

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
    expect(JSON.stringify(res.body)).not.toContain("password");
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
