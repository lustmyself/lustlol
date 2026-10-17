"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle, useI18n } from "./i18n";
import { SearchBox } from "./SearchBox";
import type { DictKey } from "@/lib/i18n/dictionaries";

const NAV: { href: string; key: DictKey }[] = [
  { href: "/leaderboard", key: "nav_leaderboard" },
  { href: "/tierlist", key: "nav_tierlist" },
  { href: "/patch", key: "nav_patch" },
];

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="lustlol">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <path d="M16 2 29 9.5v13L16 30 3 22.5v-13Z" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
        <path d="M11 9v14h10" fill="none" stroke="var(--color-teal)" strokeWidth="2.6" strokeLinecap="square" />
      </svg>
      <span className="font-display text-lg font-bold tracking-wide">
        lust<span className="text-gold">lol</span>
      </span>
    </Link>
  );
}

export function Header({ version }: { version: string }) {
  const { t } = useI18n();
  const path = usePathname();
  const onHome = path === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {NAV.map((n) => {
            const on = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 transition ${
                  on ? "bg-panel-2 text-gold" : "text-muted hover:text-text"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {!onHome && (
            <div className="hidden w-80 md:block">
              <SearchBox version={version} />
            </div>
          )}
          <LanguageToggle />
        </div>
      </div>
      {!onHome && (
        <div className="px-4 pb-3 md:hidden">
          <SearchBox version={version} />
        </div>
      )}
    </header>
  );
}
