import { expect, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";

export const FIT_LABEL_PATTERN = /Strong fit|Possible fit|Weak fit|Not recommended/;

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
}

export const resultCount = (page: Page) => page.getByText(/^\d+ opportunit(y|ies)$/);

export async function waitForList(page: Page) {
  await expect(page.getByRole("heading", { name: "Funding Opportunities" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
}
