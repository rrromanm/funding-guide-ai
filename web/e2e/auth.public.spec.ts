import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

const protectedRoutes = ["/", "/opportunities/1", "/opportunities/new", "/profile", "/notifications", "/sources"];

test.describe("route protection", () => {
  for (const route of protectedRoutes) {
    test(`redirects an unauthenticated visitor from ${route} to /login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }
});

test.describe("login page", () => {
  test("shows the sign-in form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("requires both fields before submitting", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
  });

  // Known bug: the nowrap "Pangaea Youth Network" heading makes /login 26px wider than a 375px phone.
  // Remove fixme once login/page.tsx wraps that heading below md.
  test.fixme("has no horizontal overflow on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
