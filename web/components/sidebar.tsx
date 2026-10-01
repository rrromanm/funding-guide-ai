"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const nav = [
  { href: "/", label: "Funding Opportunities" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Organization Profile" },
  { href: "/sources", label: "Sources & Coverage" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex max-h-screen min-h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-white px-4 py-8 max-md:w-20 max-md:px-2">
      <div className="flex items-center gap-3.5 px-2">
        <div className="size-11 rounded-full bg-linear-[135deg,#16B364,#3FA9A0_35%,#7A22CE]" />
        <div className="max-md:hidden">
          <div className="font-display text-lg font-bold leading-tight">Funding Guide AI</div>
          <div className="font-mono text-[11px] uppercase tracking-[.24em] text-muted">
            Pangaea Youth Network
          </div>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-2xl px-4 py-3.5 text-[17px] no-underline hover:no-underline max-md:px-2 max-md:text-center ${
                active
                  ? "bg-violet-50 font-bold text-violet-600 hover:text-violet-600"
                  : "font-semibold text-ink-600 hover:bg-canvas hover:text-ink-900"
              }`}
            >
              <span className="max-md:hidden">{label}</span>
              <span className="sr-only md:hidden">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <div className="flex items-center gap-3.5 px-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-violet-50 font-semibold text-violet-800">
            RM
          </div>
          <div className="min-w-0 max-md:hidden">
            <div className="font-bold leading-tight">Romans M.</div>
            <div className="text-[14px] text-muted">Grants coordinator</div>
          </div>
          <form action={signOut} className="ml-auto">
            <button type="submit" aria-label="Log out" className="btn btn-tertiary max-md:px-1">
              <span className="max-md:hidden">
              Log out
              </span>
              <span className="sr-only md:hidden">Log out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
