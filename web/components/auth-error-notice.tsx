"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/login/actions";
import { AUTH_ERROR_EVENT, authErrorMessage, type AuthErrorStatus } from "@/lib/services";

// Signing out clears the Supabase session first, so /login is reachable without proxy.ts bouncing back.
export function AuthErrorNotice({ status }: { status: AuthErrorStatus }) {
  const expired = status === 401;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="auth-error-title"
        aria-describedby="auth-error-message"
        className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-card"
      >
        <h2 id="auth-error-title" className="font-display text-[24px] font-bold tracking-[-.04em] text-ink-900">
          {expired ? "Session expired" : "Not authorised"}
        </h2>
        <p id="auth-error-message" className="mt-3 text-[15px] leading-relaxed text-ink-600">
          {authErrorMessage(status)}
        </p>
        <form action={signOut} className="mt-6 flex justify-end">
          <button type="submit" className="btn btn-primary">
            {expired ? "Sign in again" : "Sign out"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthErrorGate() {
  const [status, setStatus] = useState<AuthErrorStatus | null>(null);

  useEffect(() => {
    const onAuthError = (event: Event) => setStatus((event as CustomEvent<AuthErrorStatus>).detail);
    window.addEventListener(AUTH_ERROR_EVENT, onAuthError);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, onAuthError);
  }, []);

  return status ? <AuthErrorNotice status={status} /> : null;
}
