import { expect, test } from "@playwright/test";
import { API_URL } from "./helpers";
import { verifyIsolatedSession } from "./isolation";

test.skip(
  process.env.E2E_MUTATION_TESTS !== "1",
  "Real notification mutations require an explicitly opted-in isolated test environment.",
);

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
  await verifyIsolatedSession(page, authorization);
  const { items } = (await response.json()) as {
    items: { id: number; message: string; read: boolean }[];
  };
  const fixtureId = Number(process.env.E2E_NOTIFICATION_ID);
  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) throw new Error("E2E_NOTIFICATION_ID must identify the isolated seeded notification.");
  const notification = items.find((item) => item.id === fixtureId);
  expect(notification).toBeDefined();
  expect(notification?.message).toBe("Found 2 new relevant calls.");

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

    const initialAction = notification!.read ? "Mark as unread" : "Mark as read";
    const oppositeAction = notification!.read ? "Mark as read" : "Mark as unread";
    await item.getByRole("button", { name: initialAction }).click();
    await expect(item.getByRole("button", { name: oppositeAction })).toBeVisible();
    await page.reload();

    const readItem = page.getByRole("article", {
      name: "Notification: Found 2 new relevant calls.",
    });
    await expect(readItem.getByRole("button", { name: oppositeAction })).toBeVisible();
    await readItem.getByRole("button", { name: oppositeAction }).click();
    await page.reload();

    const unreadItem = page.getByRole("article", {
      name: "Notification: Found 2 new relevant calls.",
    });
    await expect(unreadItem.getByRole("button", { name: initialAction })).toBeVisible();
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
      { headers: { authorization }, data: { read: notification!.read } },
    );
    expect(cleanup.status()).toBe(200);
    const restored = await page.request.get(`${API_URL}/api/notifications/${notification!.id}`, {
      headers: { authorization },
    });
    expect(restored.status()).toBe(200);
    expect((await restored.json()).read).toBe(notification!.read);
  }
});
