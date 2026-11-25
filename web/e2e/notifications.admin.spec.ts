import { expect, test, type Page, type Route } from "@playwright/test";
import type { NotificationDetailDto } from "@/lib/types";
import { API_URL } from "./helpers";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,PATCH,OPTIONS",
};

const opportunity = (id: number, title: string) => ({
  id,
  title,
  summary: null,
  fundingBody: null,
  source: "Test funder",
  level: null,
  status: "open" as const,
  recurring: false,
  deadline: null,
  score: null,
  fitLabel: null,
  budgetMin: null,
  budgetMax: null,
  currency: "DKK",
  updatedAt: "2026-11-25T10:00:00.000Z",
});

const seedNotifications: NotificationDetailDto[] = [
  {
    id: 21,
    message: "Found 2 new relevant calls.",
    read: false,
    createdAt: "2026-11-25T10:00:00.000Z",
    fundingOpportunities: [
      opportunity(101, "Community Arts Fund"),
      opportunity(102, "Youth Futures Grant"),
    ],
  },
  {
    id: 22,
    message: "Found 1 new relevant call.",
    read: true,
    createdAt: "2026-11-24T10:00:00.000Z",
    fundingOpportunities: [
      opportunity(103, "Local Initiative Fund"),
    ],
  },
];

function itemOf({ id, message, read, createdAt }: NotificationDetailDto) {
  return { id, message, read, createdAt };
}

async function installNotificationApi(
  page: Page,
  options: { status?: number; delayList?: Promise<void> } = {},
) {
  const notifications = structuredClone(seedNotifications);
  const detailsRequested: number[] = [];

  await page.route(`${API_URL}/api/notifications**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }

    if (options.delayList && request.method() === "GET" && new URL(request.url()).pathname === "/api/notifications") {
      await options.delayList;
    }

    if (options.status && request.method() === "GET") {
      await route.fulfill({
        status: options.status,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Notifications unavailable" } }),
      });
      return;
    }

    const path = new URL(request.url()).pathname;
    const id = Number(path.split("/").at(-1));
    if (request.method() === "GET" && path === "/api/notifications") {
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ items: notifications.map(itemOf) }),
      });
      return;
    }

    const notification = notifications.find((item) => item.id === id);
    if (request.method() === "GET" && notification) {
      detailsRequested.push(id);
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify(notification),
      });
      return;
    }

    if (request.method() === "PATCH" && notification) {
      const { read } = request.postDataJSON() as { read: boolean };
      notification.read = read;
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify(itemOf(notification)),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }),
    });
  });

  return { notifications, detailsRequested };
}

test.describe("Notifications", () => {
  test("loads notifications and fetches one detail per listed notification", async ({ page }) => {
    const { detailsRequested } = await installNotificationApi(page);

    await page.goto("/notifications");

    await expect(page.getByText("Found 2 new relevant calls.")).toBeVisible();
    await expect(page.getByRole("link", { name: "View funding opportunity: Community Arts Fund" })).toHaveAttribute("href", "/opportunities/101");
    await expect(page.getByRole("link", { name: "View funding opportunity: Youth Futures Grant" })).toHaveAttribute("href", "/opportunities/102");
    await expect(page.getByText("1 unread update")).toBeVisible();
    expect(detailsRequested.sort()).toEqual([21, 22]);
  });

  test("shows a loading state while the list request is pending", async ({ page }) => {
    let releaseList!: () => void;
    const delayList = new Promise<void>((resolve) => {
      releaseList = resolve;
    });
    await installNotificationApi(page, { delayList });

    await page.goto("/notifications");
    await expect(page.getByRole("status", { name: "Loading notifications" })).toBeVisible();
    releaseList();
    await expect(page.getByText("Found 2 new relevant calls.")).toBeVisible();
  });

  test("shows the empty state when the API returns no notifications", async ({ page }) => {
    await page.route(`${API_URL}/api/notifications**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
      } else if (path === "/api/notifications") {
        await route.fulfill({
          status: 200,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        });
      } else {
        await route.fulfill({ status: 404, headers: cors, body: "{}" });
      }
    });

    await page.goto("/notifications");

    await expect(page.getByText("No notifications yet.")).toBeVisible();
    await expect(page.getByText("No unread updates")).toBeVisible();
  });

  test("shows an API error and lets the user retry", async ({ page }) => {
    let fail = true;
    await page.route(`${API_URL}/api/notifications**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
      } else if (fail) {
        await route.fulfill({
          status: 500,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Notifications unavailable" } }),
        });
      } else if (path === "/api/notifications") {
        await route.fulfill({
          status: 200,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ items: seedNotifications.map(itemOf) }),
        });
      } else {
        const notification = seedNotifications.find((item) => item.id === Number(path.split("/").at(-1)));
        await route.fulfill({
          status: notification ? 200 : 404,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify(notification ?? {}),
        });
      }
    });

    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications could not be loaded." })).toBeVisible();
    await expect(page.getByText("Notifications unavailable", { exact: true })).toBeVisible();

    fail = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Found 2 new relevant calls.")).toBeVisible();
  });

  test("persists read and unread changes across reloads", async ({ page }) => {
    const { notifications } = await installNotificationApi(page);

    await page.goto("/notifications");
    const item = page.getByRole("article", { name: "Notification: Found 2 new relevant calls." });
    await item.getByRole("button", { name: "Mark as read" }).click();

    await expect(item.getByRole("button", { name: "Mark as unread" })).toBeVisible();
    await expect(page.getByText("No unread updates")).toBeVisible();
    await page.reload();

    const reloadedItem = page.getByRole("article", { name: "Notification: Found 2 new relevant calls." });
    await expect(reloadedItem.getByRole("button", { name: "Mark as unread" })).toBeVisible();
    await expect(page.getByText("No unread updates")).toBeVisible();
    expect(notifications.find((notification) => notification.id === 21)?.read).toBe(true);

    await reloadedItem.getByRole("button", { name: "Mark as unread" }).click();
    await page.reload();
    await expect(page.getByRole("article", { name: "Notification: Found 2 new relevant calls." }).getByRole("button", { name: "Mark as read" })).toBeVisible();
    await expect(page.getByText("1 unread update")).toBeVisible();
  });

  test("marks an unread notification before navigating to its opportunity", async ({ page }) => {
    await installNotificationApi(page);
    await page.goto("/notifications");

    await page.getByRole("link", { name: "View funding opportunity: Community Arts Fund" }).click();

    await expect(page).toHaveURL(/\/opportunities\/101$/);
  });
});
