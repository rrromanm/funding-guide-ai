import { expect, test, type Page } from "@playwright/test";
import type { FundingCallDetailDto, FundingCallReviewBody } from "@/lib/types";
import { API_URL, expectNoHorizontalOverflow } from "./helpers";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "PATCH,OPTIONS",
};

async function findScoredCall(page: Page) {
  const listRequest = page.waitForRequest((request) => request.url().startsWith(`${API_URL}/api/calls`));
  await page.goto("/");
  const authorization = (await listRequest).headers().authorization;
  const response = await page.request.get(`${API_URL}/api/calls?limit=100`, {
    headers: { authorization },
  });
  expect(response.ok(), "GET /api/calls should respond").toBeTruthy();
  const { items } = (await response.json()) as { items: { id: number; score: number | null }[] };

  for (const item of items) {
    if (item.score === null) continue;
    const detailResponse = await page.request.get(`${API_URL}/api/calls/${item.id}`, {
      headers: { authorization },
    });
    if (detailResponse.ok()) {
      return { id: item.id, detail: (await detailResponse.json()) as FundingCallDetailDto };
    }
  }
  return undefined;
}

function mockReview(
  page: Page,
  id: number,
  initialCall: FundingCallDetailDto,
  update: (call: FundingCallDetailDto, body: FundingCallReviewBody) => FundingCallDetailDto,
) {
  let latestBody: FundingCallReviewBody | undefined;
  let currentCall = initialCall;
  const routePattern = `${API_URL}/api/calls/${id}/match`;
  const ready = page.route(routePattern, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    latestBody = route.request().postDataJSON() as FundingCallReviewBody;
    currentCall = update(currentCall, latestBody);
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify(currentCall),
    });
  });
  return { ready, getBody: () => latestBody };
}

const reviewed = (
  call: FundingCallDetailDto,
  body: FundingCallReviewBody,
): FundingCallDetailDto => {
  if (body.reviewStatus === "overridden") {
    return {
      ...call,
      reviewStatus: "overridden",
      score: body.manualScore!,
      fitLabel: body.manualScore! >= 75
        ? "strong_fit"
        : body.manualScore! >= 50
          ? "possible_fit"
          : body.manualScore! >= 25
            ? "weak_fit"
            : "not_recommended",
      aiScore: call.aiScore ?? call.score,
      adminNote: body.adminNote ?? null,
    };
  }
  if (body.reviewStatus === "dismissed") {
    return { ...call, reviewStatus: "dismissed", adminNote: body.adminNote ?? null };
  }
  return {
    ...call,
    reviewStatus: "generated",
    score: call.aiScore ?? call.score,
    adminNote: null,
  };
};

test.describe("Recommendation review", () => {
  test("accepts a zero score without a note and displays the confirmed response", async ({ page }) => {
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");
    const patch = mockReview(page, result!.id, result!.detail, reviewed);

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Override recommendation" }).click();
    await page.getByLabel("Manual score").fill("0");
    await page.getByRole("button", { name: "Save override" }).click();

    await expect(page.getByTestId("review-status")).toHaveText("Manually overridden");
    await expect(page.getByText("0 / 100 · Not recommended")).toBeVisible();
    await expect(page.getByText("Original AI score:")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Recommendation override saved.");
    expect(patch.getBody()).toEqual({
      reviewStatus: "overridden",
      manualScore: 0,
    });
    await patch.ready;
  });

  test("rejects scores outside integer range without sending a request", async ({ page }) => {
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");
    let requestCount = 0;
    await page.route(`${API_URL}/api/calls/${result!.id}/match`, async (route) => {
      requestCount++;
      await route.fulfill({ status: 500, headers: cors, body: "{}" });
    });

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Override recommendation" }).click();
    await page.getByLabel("Manual score").fill("101");
    await page.getByRole("button", { name: "Save override" }).click();

    await expect(page.getByRole("alert")).toHaveText("Enter a whole-number score from 0 to 100.");
    expect(requestCount).toBe(0);
  });

  test("dismisses and restores the AI recommendation", async ({ page }) => {
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");
    let currentCall = result!.detail;
    const ready = page.route(`${API_URL}/api/calls/${result!.id}/match`, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const body = route.request().postDataJSON() as FundingCallReviewBody;
      currentCall = reviewed(currentCall, body);
      await route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(currentCall) });
    });

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Dismiss recommendation" }).click();
    await page.getByLabel("Administrator note (optional)").fill("Not suitable this round.");
    await page.getByRole("button", { name: "Dismiss opportunity" }).click();

    await expect(page.getByTestId("review-status")).toHaveText("Dismissed");
    await expect(page.getByText("This opportunity is hidden from the opportunities list.")).toBeVisible();
    await expect(page.getByText("Not suitable this round.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Recommendation dismissed.");

    await page.getByRole("button", { name: "Restore AI recommendation" }).click();
    await expect(page.getByTestId("review-status")).toHaveText("AI-generated");
    await expect(page.getByRole("status")).toHaveText("AI recommendation restored.");
    expect(currentCall.reviewStatus).toBe("generated");
    expect(currentCall.adminNote).toBeNull();
    await ready;
  });

  test("shows API failure without showing success", async ({ page }) => {
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");
    await page.route(`${API_URL}/api/calls/${result!.id}/match`, async (route) =>
      route.request().method() === "OPTIONS"
        ? route.fulfill({ status: 204, headers: cors })
        : route.fulfill({ status: 500, headers: cors, contentType: "application/json", body: JSON.stringify({ error: { message: "Review could not be saved" } }) }),
    );

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Override recommendation" }).click();
    await page.getByLabel("Manual score").fill("70");
    await page.getByRole("button", { name: "Save override" }).click();

    await expect(page.getByRole("alert")).toHaveText("Review could not be saved");
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("preserves 401 and 403 authentication handling for review requests", async ({ page }) => {
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");
    let status = 401;
    await page.route(`${API_URL}/api/calls/${result!.id}/match`, async (route) =>
      route.request().method() === "OPTIONS"
        ? route.fulfill({ status: 204, headers: cors })
        : route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify({ error: { message: "Authentication failed" } }) }),
    );

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Override recommendation" }).click();
    await page.getByLabel("Manual score").fill("70");
    await page.getByRole("button", { name: "Save override" }).click();
    await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Session expired" })).toBeVisible();

    status = 403;
    await page.reload();
    await page.getByRole("button", { name: "Override recommendation" }).click();
    await page.getByLabel("Manual score").fill("70");
    await page.getByRole("button", { name: "Save override" }).click();
    await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Not authorised" })).toBeVisible();
  });

  test("review dialog fits on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const result = await findScoredCall(page);
    test.skip(!result, "no scored call found");

    await page.goto(`/opportunities/${result!.id}`);
    await page.getByRole("button", { name: "Override recommendation" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});