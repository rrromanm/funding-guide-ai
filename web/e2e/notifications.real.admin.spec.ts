import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";

test("real backend notification groups, navigation, and read state persist", async ({
  page,
}) => {
  const listResponse = page.waitForResponse(
    (response) =>
      response.url() === `${API_URL}/api/notifications` &&
      response.request().method() === "GET",
  );
  await page.goto("/notifications");

  const response = await listResponse;
  expect(response.ok()).toBeTruthy();
  const authorization = response.request().headers().authorization;
  expect(authorization).toMatch(/^Bearer\s+\S+/);
  const { items } = (await response.json()) as {
    items: { id: number; message: string; read: boolean }[];
  };
  const notification = items.find(
    (item) => item.message === "Found 2 new relevant calls.",
  );
  expect(notification).toBeDefined();
  expect(notification?.read).toBe(false);

  try {
    const item = page.getByRole("article", {
      name: "Notification: Found 2 new relevant calls.",
    });
    await expect(item).toBeVisible();
    const opportunityLink = item.getByRole("link", {
      name: "View funding opportunity: E2E SCRUM-163 Seed 20261125 01",
    });
    await expect(opportunityLink).toHaveAttribute(
      "href",
      /\/opportunities\/\d+$/,
    );
    await expect(
      item.getByRole("link", {
        name: "View funding opportunity: E2E SCRUM-163 Seed 20261125 02",
      }),
    ).toBeVisible();

    await item.getByRole("button", { name: "Mark as read" }).click();
    await expect(item.getByRole("button", { name: "Mark as unread" })).toBeVisible();
    await page.reload();

    const readItem = page.getByRole("article", {
      name: "Notification: Found 2 new relevant calls.",
    });
    await expect(readItem.getByRole("button", { name: "Mark as unread" })).toBeVisible();
    await readItem.getByRole("button", { name: "Mark as unread" }).click();
    await page.reload();

    const unreadItem = page.getByRole("article", {
      name: "Notification: Found 2 new relevant calls.",
    });
    await expect(unreadItem.getByRole("button", { name: "Mark as read" })).toBeVisible();
    await unreadItem
      .getByRole("link", {
        name: "View funding opportunity: E2E SCRUM-163 Seed 20261125 01",
      })
      .click();
    await expect(page).toHaveURL(/\/opportunities\/\d+$/);
    await expect(
      page.getByRole("heading", {
        name: "E2E SCRUM-163 Seed 20261125 01",
      }),
    ).toBeVisible();
  } finally {
    const cleanup = await page.request.patch(
      `${API_URL}/api/notifications/${notification!.id}`,
      { headers: { authorization }, data: { read: false } },
    );
    expect(cleanup.status()).toBe(200);
  }
});
