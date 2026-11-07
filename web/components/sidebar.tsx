"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const nav = [
  {
    href: "/",
    label: "Funding Opportunities",
    mobileLabel: "Funding",
    icon: <path d="M3 7.5h18v12H3zM3 10h18M7 7.5V5h10v2.5M7 14h4" />,
  },
  {
    href: "/notifications",
    label: "Notifications",
    mobileLabel: "Alerts",
    icon: <path d="M18 8a6 6 0 0 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9ZM10 20h4" />,
  },
  {
    href: "/profile",
    label: "Organization Profile",
    mobileLabel: "Profile",
    icon: <path d="M4 20V7l8-4 8 4v13H4ZM9 20v-5h6v5M8 9h.01M12 9h.01M16 9h.01" />,
  },
  {
    href: "/sources",
    label: "Sources",
    mobileLabel: "Sources",
    icon: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4ZM5 17a3 3 0 0 1 3-3h11M9 8h6" />,
  },
];

const iconClass = "size-6 shrink-0";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex max-h-screen min-h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-white px-4 py-8 max-md:w-20 max-md:px-2">
      <Link href="/" aria-label="Funding Guide AI home" className="flex items-center gap-3.5 px-2 text-inherit no-underline hover:no-underline max-md:justify-center max-md:px-0">
        <div className="size-11 rounded-full bg-linear-[135deg,#16B364,#3FA9A0_35%,#7A22CE]" />
        <div className="max-md:hidden">
          <div className="font-display text-lg font-bold leading-tight">Funding Guide AI</div>
          <div className="font-mono text-[11px] uppercase tracking-[.24em] text-muted">
            Pangaea Youth Network
          </div>
        </div>
      </Link>

      <nav aria-label="Main navigation" className="mt-8 flex flex-col gap-1">
        {nav.map(({ href, label, mobileLabel, icon }) => {
          const active = pathname === href || (href === "/" && pathname.startsWith("/opportunities/"));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`rounded-2xl px-4 py-3.5 text-[17px] no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 max-md:flex max-md:min-h-16 max-md:flex-col max-md:items-center max-md:justify-center max-md:gap-1 max-md:px-1 max-md:py-2 max-md:text-center ${
                active
                  ? "bg-violet-50 font-bold text-violet-600 hover:text-violet-600"
                  : "font-semibold text-ink-600 hover:bg-canvas hover:text-ink-900"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`${iconClass} md:hidden`}>
                {icon}
              </svg>
              <span className="max-md:hidden">{label}</span>
              <span className="text-[11px] leading-tight md:hidden">{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <div className="flex items-center gap-3.5 px-2 max-md:flex-col max-md:gap-2 max-md:px-0">
          <div className="flex size-11 items-center justify-center rounded-full bg-violet-50 font-semibold text-violet-800">
            RM
          </div>
          <div className="min-w-0 max-md:hidden">
            <div className="font-bold leading-tight">Romans M.</div>
            <div className="text-[14px] text-muted">Grants coordinator</div>
          </div>
          <form action={signOut} className="ml-auto max-md:ml-0">
            <button type="submit" aria-label="Log out" className="btn btn-tertiary max-md:min-h-12 max-md:flex-col max-md:gap-1 max-md:px-1 max-md:py-2 max-md:text-[11px] max-md:leading-tight">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`${iconClass} md:hidden`}>
                <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
              </svg>
              <span>Log out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
