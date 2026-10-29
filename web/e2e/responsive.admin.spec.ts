import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

const pages = [
  { name: "dashboard", path: "/", ready: "Funding Opportunities" },
  { name: "profile", path: "/profile", ready: "Organization Profile" },
  { name: "notifications", path: "/notifications", ready: "Notifications" },
  { name: "sources", path: "/sources", ready: "Sources" },
];

test.describe("pages load and sidebar navigation", () => {
  test("every sidebar link opens its page", async ({ page }) => {
    await page.goto("/");
    for (const { path, ready } of [pages[2], pages[1], pages[3], pages[0]]) {
      await page.getByRole("navigation").locator(`a[href="${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}$`));
      await expect(page.getByRole("heading", { level: 1, name: ready })).toBeVisible();
    }
  });

  test("the Sources page lists the collected sources", async ({ page }) => {
    await page.goto("/sources");

    await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Source" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
});

test.describe("phone layout", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  for (const { name, path, ready } of pages) {
    test(`${name} has no horizontal overflow and stays usable`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1, name: ready })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("an opportunity page has no horizontal overflow and keeps its actions reachable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await page.locator("tbody tr").first().getByRole("link").first().click();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit opportunity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete opportunity" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("navigation still works through the icon rail", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("navigation").locator('a[href="/profile"]').click();

    await expect(page).toHaveURL(/\/profile$/);
  });
});
