import { expect, test, type Page } from "@playwright/test";
import { API_URL, FIT_LABEL_PATTERN, waitForList } from "./helpers";

const DESCRIPTION_PREVIEW_LENGTH = 900;

async function findCallId(page: Page, matches: (call: { description: string | null; confidence: string | null; reasons: unknown[] }) => boolean) {
  const list = await page.request.get(`${API_URL}/api/calls?limit=40`);
  expect(list.ok(), "GET /api/calls should respond").toBeTruthy();
  const { items } = (await list.json()) as { items: { id: number }[] };

  for (const { id } of items) {
    const detail = await page.request.get(`${API_URL}/api/calls/${id}`);
    if (detail.ok() && matches(await detail.json())) return id;
  }
  return undefined;
}

test.describe("Opportunity details", () => {
  test("opens from the list and shows the call and its recommendation", async ({ page }) => {
    await page.goto("/");
    await waitForList(page);
    const link = page.locator("tbody tr").first().getByRole("link").first();
    const title = (await link.innerText()).trim();

    await link.click();

    await expect(page).toHaveURL(/\/opportunities\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Match score", { exact: true })).toBeVisible();
    await expect(page.getByText(/\/ 100/)).toContainText(FIT_LABEL_PATTERN);
    await expect(page.getByRole("heading", { name: "Key details" })).toBeVisible();
  });

  test("shows the AI recommendation with confidence and reasons for a scored call", async ({ page }) => {
    const id = await findCallId(page, (call) => call.confidence !== null && call.reasons.length > 0);
    test.skip(id === undefined, "no scored call with reasons found");

    await page.goto(`/opportunities/${id}`);

    await expect(page.getByText("AI recommendation", { exact: true })).toBeVisible();
    await expect(page.getByText("Confidence:")).toBeVisible();
    await expect(page.getByText(/^(Strength|Barrier|Info|Blocker)$/).first()).toBeVisible();
  });

  test("Show more / Show less toggles a long description", async ({ page }) => {
    const id = await findCallId(page, (call) => (call.description?.length ?? 0) > DESCRIPTION_PREVIEW_LENGTH);
    test.skip(id === undefined, "no call with a long description found");

    await page.goto(`/opportunities/${id}`);
    const toggle = page.getByRole("button", { name: "Show more" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    const less = page.getByRole("button", { name: "Show less" });
    await expect(less).toHaveAttribute("aria-expanded", "true");

    await less.click();
    await expect(page.getByRole("button", { name: "Show more" })).toBeVisible();
  });

  test("shows Edit and Delete actions without deleting anything", async ({ page }) => {
    await page.goto("/");
    await waitForList(page);
    await page.locator("tbody tr").first().getByRole("link").first().click();

    await expect(page.getByRole("link", { name: "Edit opportunity" })).toHaveAttribute("href", /\/opportunities\/\d+\/edit$/);
    await page.getByRole("button", { name: "Delete opportunity" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/opportunities\/\d+$/);
  });

  test("the Back link returns to the list", async ({ page }) => {
    await page.goto("/");
    await waitForList(page);
    await page.locator("tbody tr").first().getByRole("link").first().click();

    await page.getByRole("link", { name: "Back to opportunities" }).click();

    await expect(page).toHaveURL(/\/$/);
    await waitForList(page);
  });

  test("an unknown opportunity shows the not-found page", async ({ page }) => {
    await page.goto("/opportunities/999999999");

    await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
  });
});
