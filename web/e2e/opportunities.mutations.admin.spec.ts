import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

type CleanupPool = {
  query: (sql: string, values: number[]) => Promise<unknown>;
  end: () => Promise<void>;
};

const requireApiDependency = createRequire(
  resolve(__dirname, "../../api/package.json"),
);
const { Pool } = requireApiDependency("pg") as {
  Pool: new (config: { connectionString: string }) => CleanupPool;
};

const mutationTestsEnabled = process.env.E2E_MUTATION_TESTS === "1";
const description =
  "This isolated Playwright test opportunity describes a community programme. " +
  "Applicants must be non-profit organisations supporting young people through " +
  "education, creative activities, and local partnerships. The grant supports " +
  "project costs, materials, facilitation, and accessible participation. " +
  "Applications should explain the need, activities, intended outcomes, " +
  "safeguarding approach, delivery schedule, and budget. A review panel assesses " +
  "the proposal against community benefit, feasibility, inclusion, and value for money. " +
  "Successful applicants receive a written decision and agree to submit a short " +
  "completion report describing the work and its impact.";

async function hardDeleteCall(id: number) {
  const connectionString = process.env.E2E_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error("E2E_TEST_DATABASE_URL is required to clean up mutation-test records.");
  }
  const databaseUrl = new URL(connectionString);
  if (
    !["127.0.0.1", "localhost"].includes(databaseUrl.hostname) ||
    databaseUrl.port !== "55422" ||
    databaseUrl.pathname !== "/postgres"
  ) {
    throw new Error("Refusing to clean up mutation-test records outside the isolated local database.");
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query("DELETE FROM funding_call WHERE id = $1", [id]);
  } finally {
    await pool.end();
  }
}

test.describe("Funding opportunity persistence (isolated database only)", () => {
  test.skip(
    !mutationTestsEnabled,
    "Set E2E_MUTATION_TESTS=1 with the guarded local test database to run mutation tests.",
  );

  test("creates, edits, reloads, and deletes an opportunity with persisted changes", async ({
    page,
  }) => {
    const marker = randomUUID();
    const initialTitle = `E2E SCRUM-163 ${marker}`;
    const updatedTitle = `${initialTitle} updated`;
    let callId: number | undefined;
    let authorization: string | undefined;

    try {
      const callsRequest = page.waitForRequest((request) =>
        request.url().startsWith(`${API_URL}/api/calls`),
      );
      await page.goto("/");
      authorization = (await callsRequest).headers().authorization;
      expect(authorization).toMatch(/^Bearer\s+\S+/);

      await page.goto("/opportunities/new");
      await page.getByLabel("Title").fill(initialTitle);
      await page.getByLabel("Description").fill(description);

      const createResponse = page.waitForResponse(
        (response) =>
          response.url() === `${API_URL}/api/calls` &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Save and score" }).click();
      const created = await createResponse;
      authorization = created.request().headers().authorization;
      const createdPayload: unknown = await created.json();
      if (
        createdPayload &&
        typeof createdPayload === "object" &&
        "id" in createdPayload &&
        typeof createdPayload.id === "number"
      ) {
        callId = createdPayload.id;
      }
      expect(created.status()).toBe(201);
      expect(callId).toBeGreaterThan(0);

      await expect(page).toHaveURL(new RegExp(`/opportunities/${callId}$`));
      const createdRecord = await page.request.get(`${API_URL}/api/calls/${callId}`, {
        headers: { authorization },
      });
      expect(createdRecord.status()).toBe(200);
      expect((await createdRecord.json()).title).toBe(initialTitle);

      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: initialTitle })).toBeVisible();

      await page.goto(`/opportunities/${callId}/edit`);
      await page.getByLabel("Title").fill(updatedTitle);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.getByRole("button", { name: "Not now" }).click();
      await expect(page).toHaveURL(new RegExp(`/opportunities/${callId}$`));

      const updatedRecord = await page.request.get(`${API_URL}/api/calls/${callId}`, {
        headers: { authorization },
      });
      expect(updatedRecord.status()).toBe(200);
      expect((await updatedRecord.json()).title).toBe(updatedTitle);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: updatedTitle })).toBeVisible();

      await page.getByRole("button", { name: "Delete opportunity" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page).toHaveURL(/\/$/);

      const deletedRecord = await page.request.get(`${API_URL}/api/calls/${callId}`, {
        headers: { authorization },
      });
      expect(deletedRecord.status()).toBe(404);
    } finally {
      if (callId) {
        try {
          if (authorization) {
            const cleanup = await page.request.delete(`${API_URL}/api/calls/${callId}`, {
              headers: { authorization },
            });
            expect(
              cleanup.ok() || cleanup.status() === 404,
              "cleanup must remove the isolated E2E record through the API",
            ).toBeTruthy();
          }
        } finally {
          await hardDeleteCall(callId);
        }
      }
    }
  });
});
