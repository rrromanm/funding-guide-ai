import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "./helpers";

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,OPTIONS",
};
const call = (id: number, title: string, level = "national") => ({
  id, title, summary: null, fundingBody: "Test funder", source: "manual", level,
  status: "open", recurring: false, deadline: null, score: null, fitLabel: null,
  budgetMin: null, budgetMax: null, currency: "DKK", updatedAt: "2026-01-01",
});
const items = Array.from({ length: 8 }, (_, index) =>
  call(index + 1, `Test opportunity ${index + 1}`, index === 7 ? "local" : "national"),
);
const respond = (values: ReturnType<typeof call>[]) => ({
  items: values, total: values.length, limit: 100, offset: 0,
});

async function installApi(page: Page, initialGate?: Promise<void>) {
  let releaseSlow!: () => void;
  const slowGate = new Promise<void>((resolve) => { releaseSlow = resolve; });
  let slowStarted!: () => void;
  const started = new Promise<void>((resolve) => { slowStarted = resolve; });
  const terms: string[] = [];
  let fail = false;
  await page.route(`${API_URL}/api/calls?*`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(route.request().url());
    const term = url.searchParams.get("q") ?? "";
    terms.push(term);
    if (!term && initialGate) await initialGate;
    if (term === "slow") {
      slowStarted();
      await slowGate;
    }
    if (fail) {
      await route.fulfill({ status: 500, headers, body: "failure" });
      return;
    }
    const values = url.searchParams.get("status") === "closed" ? [] :
      term === "slow" ? [call(100, "Stale result")] :
      term === "fast" ? [call(101, "Latest result")] : items;
    await route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify(respond(values)) });
  });
  return { terms, started, releaseSlow, setFail: (value: boolean) => { fail = value; } };
}

test("debounces rapid changes and ignores delayed stale results", async ({ page }) => {
  const api = await installApi(page);
  await page.goto("/");
  await expect(page.getByText("Test opportunity 1", { exact: true })).toBeVisible();
  const search = page.getByLabel("Search");
  await search.fill("s");
  await search.fill("sl");
  await search.fill("slow");
  await api.started;
  expect(api.terms).not.toContain("s");
  expect(api.terms).not.toContain("sl");
  await search.fill("fast");
  await expect(page.getByText("Latest result", { exact: true })).toBeVisible();
  const slowCurrent = page.waitForResponse((response) =>
    new URL(response.url()).searchParams.get("q") === "slow" &&
    !new URL(response.url()).searchParams.has("status"),
  );
  const slowClosed = page.waitForResponse((response) =>
    new URL(response.url()).searchParams.get("q") === "slow" &&
    new URL(response.url()).searchParams.get("status") === "closed",
  );
  api.releaseSlow();
  await Promise.all([slowCurrent, slowClosed]);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByText("Latest result", { exact: true })).toBeVisible();
  await expect(page.getByText("Stale result", { exact: true })).toHaveCount(0);
});

test("filters and pagination show the expected distinct records and reset the page", async ({ page }) => {
  await installApi(page);
  await page.goto("/");
  await expect(page.getByText("Test opportunity 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Test opportunity 7", { exact: true })).toBeVisible();
  await expect(page.getByText("Test opportunity 1", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByLabel("Funding level").selectOption("local");
  await expect(page.getByText("Test opportunity 8", { exact: true })).toBeVisible();
  await expect(page.getByText("Test opportunity 7", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Page 1 of 1")).toBeVisible();
});

test("shows loading and recovers after a failed list request", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const api = await installApi(page, gate);
  api.setFail(true);
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading funding opportunities" })).toBeVisible();
  release();
  await expect(page.getByText("Funding opportunities could not be loaded.")).toBeVisible();
  api.setFail(false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Test opportunity 1", { exact: true })).toBeVisible();
});
