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

  for (const width of [320, 375, 414, 767, 768, 1023, 1024, 1440]) {
    test(`fits without horizontal overflow at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/login");

      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      for (const selector of ["#email", "#password", 'button[type="submit"]']) {
        const bounds = await page.locator(selector).evaluate((element) => {
          const { left, right, width: elementWidth } = element.getBoundingClientRect();
          return { left, right, width: elementWidth };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(width);
        if (width >= 768) {
          expect(bounds.width).toBeGreaterThanOrEqual(240);
        }
      }
    });
  }
});
