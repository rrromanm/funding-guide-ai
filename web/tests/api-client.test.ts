import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, AUTH_ERROR_EVENT } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ auth: { getSession } })),
}));
const createSupabase = vi.mocked(createClient);

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("prefers an explicit token and preserves other request headers", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await apiFetch("/example", { headers: { "x-test": "present" } }, "explicit");
    expect(createSupabase).not.toHaveBeenCalled();
    const headers = fetch.mock.calls[0][1].headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer explicit");
    expect(headers.get("x-test")).toBe("present");
  });

  it("falls back to the current session token", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "session" } } });
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await apiFetch("/example");
    expect((fetch.mock.calls[0][1].headers as Headers).get("authorization")).toBe("Bearer session");
  });

  it.each([401, 403] as const)("dispatches an auth notification and throws for %i", async (status) => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    await expect(apiFetch("/example", {}, "token")).rejects.toMatchObject({ name: "ApiRequestError", status });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(AUTH_ERROR_EVENT);
    expect(event.detail).toBe(status);
  });

  it("returns other error responses for feature-specific handling", async () => {
    const response = new Response("bad request", { status: 400 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(apiFetch("/example", {}, "token")).resolves.toBe(response);
  });
});
