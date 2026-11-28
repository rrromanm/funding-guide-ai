import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";
import { verifyIsolatedSession, withIsolatedDatabase } from "./isolation";

test.skip(process.env.E2E_MUTATION_TESTS !== "1", "Requires the isolated mutation environment.");
test.describe.configure({ mode: "serial" });

test("saves and reloads the profile, then restores its original state", async ({ page }) => {
  const responsePromise = page.waitForResponse((response) =>
    response.url() === `${API_URL}/api/profile` && response.request().method() === "GET",
  );
  await page.goto("/profile");
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const authorization = response.request().headers().authorization;
  await verifyIsolatedSession(page, authorization);
  const original = await response.json() as {
    staffCount: number; adminCapacity: string | null; themes: string[]; targetGroups: string[];
  };
  const marker = randomUUID();
  const theme = `E2E theme ${marker}`;
  const group = `E2E group ${marker}`;
  const expected = {
    staffCount: original.staffCount + 1,
    adminCapacity: `E2E capacity ${marker}`,
    themes: [...original.themes, theme].sort(),
    targetGroups: [...original.targetGroups, group].sort(),
  };
  try {
    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.getByLabel("Staff count / team size").fill(String(expected.staffCount));
    await page.getByLabel("Administrative capacity").fill(expected.adminCapacity);
    await page.getByRole("textbox", { name: "New themes" }).fill(theme);
    await page.getByRole("textbox", { name: "New themes" }).press("Enter");
    await page.getByRole("textbox", { name: "New target groups" }).fill(group);
    await page.getByRole("textbox", { name: "New target groups" }).press("Enter");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Organization profile saved successfully.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Staff count / team size")).toHaveValue(String(expected.staffCount));
    await expect(page.getByLabel("Administrative capacity")).toHaveValue(expected.adminCapacity);
    await expect(page.getByText(theme, { exact: true })).toBeVisible();
    await expect(page.getByText(group, { exact: true })).toBeVisible();
    const saved = await page.request.get(`${API_URL}/api/profile`, { headers: { authorization } });
    expect(saved.status()).toBe(200);
    expect(await saved.json()).toMatchObject(expected);
  } finally {
    const restore = await page.request.patch(`${API_URL}/api/profile`, {
      headers: { authorization },
      data: {
        staffCount: original.staffCount,
        adminCapacity: original.adminCapacity,
        themes: original.themes,
        targetGroups: original.targetGroups,
      },
    });
    expect(restore.status(), "profile restoration must succeed").toBe(200);
    const restored = await page.request.get(`${API_URL}/api/profile`, { headers: { authorization } });
    expect(restored.status()).toBe(200);
    expect(await restored.json()).toMatchObject({
      staffCount: original.staffCount, adminCapacity: original.adminCapacity,
      themes: original.themes, targetGroups: original.targetGroups,
    });
    await withIsolatedDatabase(async (pool) => {
      await pool.query(
        "DELETE FROM tag WHERE label IN ($1, $2) AND NOT EXISTS (SELECT 1 FROM org_profile_tag WHERE tag_id = tag.id) AND NOT EXISTS (SELECT 1 FROM funding_call_tag WHERE tag_id = tag.id)",
        [theme, group],
      );
      const remaining = await pool.query("SELECT id FROM tag WHERE label IN ($1, $2)", [theme, group]);
      expect(remaining.rows, "test-created tags must not remain").toHaveLength(0);
    });
  }
});
