import { expect, test } from "@playwright/test";

// Read-only: nothing here saves. Add/remove chips are discarded with Cancel.
test.describe("Organization profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("Matching information")).toBeVisible();
  });

  test("loads the real profile with theme and target-group chips", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "What we work on" })).toBeVisible();
    await expect(page.locator("dt")).toContainText(["Name", "Legal status", "City", "Country"]);

    const themes = page.getByText(/^Themes · \d+$/);
    const groups = page.getByText(/^Target groups · \d+$/);
    await expect(themes).toBeVisible();
    await expect(groups).toBeVisible();
    expect(Number((await themes.innerText()).split("·")[1])).toBeGreaterThan(0);
    expect(Number((await groups.innerText()).split("·")[1])).toBeGreaterThan(0);
  });

  test("Edit opens only the fields the API can save", async ({ page }) => {
    await page.getByRole("button", { name: "Edit Profile" }).click();

    await expect(page.getByLabel("Staff count / team size")).toBeEditable();
    await expect(page.getByLabel("Administrative capacity")).toBeEditable();
    await expect(page.getByRole("textbox", { name: "New themes" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "New target groups" })).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  });

  test("chips can be added, rejected as duplicates or blanks, and discarded with Cancel", async ({ page }) => {
    const themes = page.getByText(/^Themes · \d+$/i);
    // textContent ignores CSS text-transform, unlike innerText.
    const count = async () => Number(((await themes.textContent()) ?? "").split("·")[1]);
    await page.getByRole("button", { name: "Edit Profile" }).click();
    const before = await count();
    const input = page.getByRole("textbox", { name: "New themes" });

    await input.fill("e2e temporary theme");
    await input.press("Enter");
    await expect(page.getByText("e2e temporary theme")).toBeVisible();
    await expect.poll(count).toBe(before + 1);

    await input.fill("e2e temporary theme");
    await input.press("Enter");
    await input.fill("   ");
    await page.getByRole("button", { name: "+ Add" }).first().click();
    await expect(page.getByText("e2e temporary theme")).toHaveCount(1);
    await expect.poll(count).toBe(before + 1);

    await page.getByRole("button", { name: "Remove e2e temporary theme" }).click();
    await expect.poll(count).toBe(before);

    await input.fill("e2e discarded theme");
    await input.press("Enter");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("e2e discarded theme")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit Profile" })).toBeVisible();
    await expect.poll(count).toBe(before);
  });
});
