"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/workspace/", label: "Workspace" },
  { href: "/history/", label: "History" },
  { href: "/about/", label: "About" },
] as const;

export function Header() {
  const pathname = usePathname();
  const { history_enabled: historyEnabled } = useSettings();
  const links = NAV.filter((l) => historyEnabled || l.href !== "/history/");

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
          Safe<span className="text-device">Share</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-1 text-sm">
            {links.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href.slice(0, -1));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2 transition-colors ${
                      active
                        ? "bg-device-soft font-medium text-device"
                        : "text-muted hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
