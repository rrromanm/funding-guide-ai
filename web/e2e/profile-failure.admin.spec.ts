import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

test("profile save failure remains visible without displaying success", async ({ page }) => {
  await page.route(`${API_URL}/api/profile`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await route.fulfill({
      status: 500,
      headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type" },
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Failed" } }),
    });
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit Profile" }).click();
  await page.getByLabel("Staff count / team size").fill("42");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Organization profile could not be saved" })).toBeVisible();
  await expect(page.getByText("Organization profile saved successfully.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  await expect(page.getByLabel("Staff count / team size")).toHaveValue("42");
});
