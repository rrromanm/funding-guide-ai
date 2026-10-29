import { expect, test } from "@playwright/test";
import { FIT_LABEL_PATTERN, resultCount, waitForList } from "./helpers";

test.describe("Funding Opportunities list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForList(page);
  });

  test("shows real calls with a score and a fit label", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();

    await expect(firstRow.getByRole("link").first()).not.toBeEmpty();
    await expect(firstRow).toContainText(/\d+\/100/);
    await expect(firstRow).toContainText(FIT_LABEL_PATTERN);
  });

  test("search narrows the list through the API and clearing restores it", async ({ page }) => {
    const total = await resultCount(page).innerText();
    const title = (await page.locator("tbody tr").first().getByRole("link").first().innerText()).trim();

    const searched = page.waitForResponse((response) => response.url().includes("/api/calls") && response.url().includes("q="));
    await page.getByLabel("Search").fill(title);
    await searched;

    await expect(page.locator("tbody tr").filter({ hasText: title }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();

    await page.getByLabel("Search").fill("");
    await expect(resultCount(page)).toHaveText(total);
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await page.getByLabel("Search").fill("zzz-no-such-funding-call-zzz");

    await expect(page.getByText("No funding opportunities found.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await waitForList(page);
  });

  test("the fit filter only keeps calls with the chosen fit label", async ({ page }) => {
    await page.getByLabel("Fit").selectOption("Possible fit");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) {
      await expect(row).toContainText("Possible fit");
    }
  });

  test("the status filter only keeps calls with the chosen status", async ({ page }) => {
    await page.getByLabel("Status").selectOption("OPEN");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) {
      await expect(row).toContainText("Open");
    }
  });

  test("filters combine and can be cleared", async ({ page }) => {
    const total = await resultCount(page).innerText();

    await page.getByLabel("Fit").selectOption("Possible fit");
    await page.getByLabel("Status").selectOption("OPEN");
    await expect(resultCount(page)).not.toHaveText(total);

    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(resultCount(page)).toHaveText(total);
  });

  test("pagination moves between pages", async ({ page }) => {
    const info = page.getByText(/^Page \d+ of \d+$/);
    await expect(info).toContainText("Page 1 of");

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(info).toContainText("Page 2 of");

    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(info).toContainText("Page 1 of");
  });
});
