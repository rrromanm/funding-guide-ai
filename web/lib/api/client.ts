import { createClient as createBrowserSupabase } from "../supabase/client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const AUTH_ERROR_EVENT = "api-auth-error";

export type AuthErrorStatus = 401 | 403;

export function isAuthErrorStatus(status: number): status is AuthErrorStatus {
  return status === 401 || status === 403;
}

export function authErrorMessage(status: AuthErrorStatus) {
  return status === 401
    ? "Your session is no longer valid. Please sign in again."
    : "This account is not authorised to access PYN Admin functionality.";
}

export async function apiFetch(path: string, init: RequestInit = {}, accessToken?: string) {
  accessToken ??= (await createBrowserSupabase().auth.getSession()).data.session?.access_token;
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (isAuthErrorStatus(response.status)) {
    // Browser requests announce the failure so one gate can show it; server pages catch the error instead.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, { detail: response.status }));
    }
    throw new ApiRequestError(authErrorMessage(response.status), response.status);
  }
  return response;
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}
