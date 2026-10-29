import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";

setup("sign in as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Funding Opportunities" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
