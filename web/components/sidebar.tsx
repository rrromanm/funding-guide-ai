"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const nav = [
  { href: "/", label: "Funding calls", count: 6 },
  { href: "/watchlist", label: "Watchlist", count: 2 },
  { href: "/profile", label: "Organisation profile" },
  { href: "/sources", label: "Sources", count: 6 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-70 shrink-0 flex flex-col gap-8 border-r border-hairline bg-white px-4 py-8 min-h-screen sticky top-0 max-h-screen overflow-y-auto">
      <div className="flex items-center gap-3.5 px-2">
        <div className="size-11 rounded-full bg-linear-[135deg,#16B364,#3FA9A0_35%,#7A22CE]" />
        <div>
          <div className="font-display text-lg font-bold leading-tight">
            Funding Guide AI
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[.24em] text-muted">
            Pangaea Youth Network
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map(({ href, label, count }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px] no-underline hover:no-underline ${
                active
                  ? "bg-violet-50 font-bold text-violet-600 hover:text-violet-600"
                  : "font-semibold text-ink-600 hover:bg-canvas hover:text-ink-900"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={active ? "text-violet-800" : "text-muted"}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-6">
        <div className="panel-gradient flex flex-col gap-4 text-[15px] leading-relaxed">
          Public site, project pages and testimonials live on the main network
          site.
          <a
            href="https://pangaeayouth.org"
            target="_blank"
            rel="noreferrer"
            className="btn self-start bg-white px-5 py-2.5 text-violet-600 hover:no-underline hover:text-violet-800"
          >
            pangaeayouth.org ↗
          </a>
        </div>

        <div className="flex items-center gap-3.5 px-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-violet-50 font-semibold text-violet-800">
            RM
          </div>
          <div className="min-w-0">
            <div className="font-bold leading-tight">Romans M.</div>
            <div className="text-[14px] text-muted">Grants coordinator</div>
          </div>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="btn btn-tertiary">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
