import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotifications, updateNotificationRead } from "@/features/notifications/api";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api/client")>(),
  apiFetch: vi.fn(),
}));

const request = vi.mocked(apiFetch);
const item = { id: 12, message: "New calls", read: false, createdAt: "2026-01-01" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => request.mockReset());

describe("notification API", () => {
  it("deduplicates in-flight list and detail requests, then fetches afresh", async () => {
    let resolveList!: (value: Response) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => { resolveList = resolve; }));
    request.mockResolvedValueOnce(json({ ...item, fundingOpportunities: [{ id: 3, title: "Call" }] }));
    const first = getNotifications();
    const second = getNotifications();
    expect(first).toBe(second);
    expect(request).toHaveBeenCalledTimes(1);
    resolveList(json({ items: [item] }));
    await expect(first).resolves.toEqual([{ ...item, fundingOpportunities: [{ id: 3, title: "Call" }] }]);
    expect(request).toHaveBeenNthCalledWith(2, "/api/notifications/12", { cache: "no-store" });
    request.mockResolvedValueOnce(json({ items: [] }));
    await expect(getNotifications()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("clears the in-flight request after failure and allows a retry", async () => {
    request.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(getNotifications()).rejects.toThrow("network unavailable");
    request.mockResolvedValueOnce(json({ items: [] }));
    await expect(getNotifications()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed list and detail responses", async () => {
    request.mockResolvedValueOnce(json({ items: [{ ...item, read: "no" }] }));
    await expect(getNotifications()).rejects.toThrow("Loading notifications returned an unexpected response");
    request.mockResolvedValueOnce(json({ items: [item] }));
    request.mockResolvedValueOnce(json({ ...item, fundingOpportunities: [{ id: "3", title: "Call" }] }));
    await expect(getNotifications()).rejects.toThrow("Loading notification details returned an unexpected response");
  });

  it("preserves validation details for an unsuccessful update", async () => {
    request.mockResolvedValueOnce(json({ error: { details: [{ path: "read", message: "Expected boolean" }] } }, 400));
    await expect(updateNotificationRead(12, true)).rejects.toMatchObject({
      name: "ApiRequestError", status: 400, message: "read: Expected boolean",
    });
    expect(request).toHaveBeenCalledWith("/api/notifications/12", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ read: true }),
    }));
  });
});
