import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "./helpers";

// The API is mocked, so nothing is read or written. The sign-out button is not clicked here:
// Supabase signs out every session of the user, which would break the other admin tests.

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

// Preflights must succeed, otherwise the browser reports a network error instead of the mocked status.
function mockApi(page: Page, status: number, code: string) {
  return page.route(`${API_URL}/api/**`, (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ status: 204, headers: cors })
      : route.fulfill({
          status,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ error: { code, message: code } }),
        }),
  );
}

test.describe("protected API authentication", () => {
  test("sends the Supabase access token as a Bearer header", async ({ page }) => {
    const request = page.waitForRequest((req) => req.url().startsWith(`${API_URL}/api/calls`));
    await page.goto("/");

    expect((await request).headers().authorization).toMatch(/^Bearer \S+$/);
  });

  test("a 401 asks the user to sign in again", async ({ page }) => {
    await mockApi(page, 401, "UNAUTHORIZED");
    await page.goto("/");

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Session expired" })).toBeVisible();
    await expect(dialog).toContainText("Your session is no longer valid. Please sign in again.");
    await expect(dialog.getByRole("button", { name: "Sign in again" })).toBeEnabled();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("a 403 says the account is not authorised, not that loading failed", async ({ page }) => {
    await mockApi(page, 403, "FORBIDDEN");
    await page.goto("/");

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Not authorised" })).toBeVisible();
    await expect(dialog).toContainText("not authorised to access PYN Admin");
    await expect(dialog.getByRole("button", { name: "Sign out" })).toBeEnabled();
    await expect(dialog).not.toContainText("Sign in again");
  });

  test("a 401 on another page shows the same notice", async ({ page }) => {
    await mockApi(page, 401, "UNAUTHORIZED");
    await page.goto("/profile");

    await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Session expired" })).toBeVisible();
  });

  test("a server error keeps the normal error state and does not sign the user out", async ({ page }) => {
    await mockApi(page, 500, "INTERNAL_ERROR");
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Funding opportunities could not be loaded." })).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("a network failure keeps the normal error state and does not sign the user out", async ({ page }) => {
    await page.route(`${API_URL}/api/**`, (route) => route.abort());
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Funding opportunities could not be loaded." })).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });
});
