import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

test("native required and length constraints prevent invalid requests; server errors remain actionable", async ({ page }) => {
  let submissions = 0;
  await page.route(`${API_URL}/api/calls`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submissions++;
    await route.fulfill({
      status: 400,
      headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" },
      contentType: "application/json",
      body: JSON.stringify({ error: { details: [{ path: "title", message: "Rejected by validation" }] } }),
    });
  });
  await page.goto("/opportunities/new");
  const title = page.getByLabel("Title", { exact: true });
  const description = page.getByLabel("Description");
  const submit = page.getByRole("button", { name: "Save and score" });

  await submit.click();
  expect(await title.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  expect(submissions).toBe(0);
  await title.fill("Validation test");
  await submit.click();
  expect(await description.evaluate((input: HTMLTextAreaElement) => input.validity.valueMissing)).toBe(true);
  expect(submissions).toBe(0);
  await description.fill("x".repeat(499));
  await submit.click();
  expect(await description.evaluate((input: HTMLTextAreaElement) => input.validity.tooShort)).toBe(true);
  expect(submissions).toBe(0);
  await description.fill("x".repeat(500));
  await submit.click();
  await expect(page.getByText("title: Rejected by validation")).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page).toHaveURL(/\/opportunities\/new$/);
  await expect(submit).toBeEnabled();
  await expect(title).toHaveValue("Validation test");
  await expect(description).toHaveValue("x".repeat(500));
});
