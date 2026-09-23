import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.ts";

test("health and docs are served", async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  const { port } = server.address() as { port: number };

  const health = await fetch(`http://localhost:${port}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  assert.equal((await fetch(`http://localhost:${port}/openapi.json`)).status, 200);
  assert.equal((await fetch(`http://localhost:${port}/docs/`)).status, 200);
  assert.equal((await fetch(`http://localhost:${port}/nope`)).status, 404);
});
