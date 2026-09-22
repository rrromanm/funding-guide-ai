import Image from "next/image";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? error : undefined;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col justify-between gap-12 bg-brand p-8 text-white md:basis-3/5 md:p-14">
        <Image
          src="/logo-pyn.png"
          alt="Pangaea Youth Network"
          width={600}
          height={279}
          priority
          className="h-auto w-50 brightness-0 invert"
        />

        <div className="flex flex-col gap-5">
          <p className="font-mono text-[11px] uppercase tracking-[.24em] text-white/70">
            Bachelor project · 2026
          </p>
          <h2 className="max-w-115 font-display text-[28px] font-bold leading-[1.1] tracking-[-.02em] md:text-[40px]">
            <span className="block whitespace-nowrap">
              Pangaea Youth Network
            </span>
            <hr className="my-4 border-white/25" />
            <span className="block">Funding Guide AI</span>
          </h2>
          <p className="max-w-115 text-[15px] leading-relaxed text-white/75 md:text-[17px]">
            Screened funding calls for Region Midtjylland, each with the
            reasoning behind its fit rating — never a bare number.
          </p>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[.24em] text-white/60">
          pangaeayouth.org
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center p-8 md:basis-2/5">
        <div className="card-panel flex w-full max-w-105 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-.02em]">
              Sign in
            </h1>
            <p className="text-[15px] leading-relaxed text-ink-600">
              Admin access only. Accounts are created by the Pangaea Youth
              Network team.
            </p>
          </div>

          {message && (
            <p
              role="alert"
              className="rounded-[20px] border border-red-200 bg-red-50 px-4.5 py-3 text-[14px] font-bold text-red-600"
            >
              {message}
            </p>
          )}

          <form action={signIn} className="flex flex-col gap-5">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
              />
            </div>

            <button type="submit" className="btn btn-primary mt-1">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
