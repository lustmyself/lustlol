"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "./i18n";
import { DEFAULT_SERVER, SERVERS, parseRiotIdInput, riotIdToSlug } from "@/lib/riot/servers";
import { img } from "@/lib/riot/images";
import type { SearchSuggestion } from "@/lib/riot/types";

const RECENT_KEY = "lustlol_recent";
const SERVER_KEY = "lustlol_server";

type Recent = Pick<SearchSuggestion, "name" | "tag" | "server" | "profileIconId">;

function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushRecent(r: Recent) {
  try {
    const list = readRecent().filter(
      (x) => !(x.server === r.server && x.name.toLowerCase() === r.name.toLowerCase() && x.tag.toLowerCase() === r.tag.toLowerCase()),
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify([r, ...list].slice(0, 8)));
  } catch {}
}

export function SearchBox({ version, size = "md", autoFocus = false }: { version: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SERVER_KEY);
      if (saved && SERVERS.some((s) => s.id === saved)) setServer(saved);
    } catch {}
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&server=${server}`, { signal: ctrl.signal });
        if (res.ok) setResults(await res.json());
      } catch {
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, q.includes("#") ? 350 : 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, server]);

  function go(name: string, tag: string, srv = server) {
    setOpen(false);
    setQuery("");
    router.push(`/summoner/${srv}/${riotIdToSlug(name, tag)}`);
  }

  function submit() {
    if (active >= 0 && list[active]) {
      const p = list[active];
      return go(p.name, p.tag, p.server);
    }
    const id = parseRiotIdInput(query);
    if (!id) {
      setError(t("search_bad_format"));
      return;
    }
    go(id.name, id.tag);
  }

  function chooseServer(id: string) {
    setServer(id);
    try {
      localStorage.setItem(SERVER_KEY, id);
    } catch {}
  }

  const showRecent = query.trim().length < 2;
  const list: Recent[] = showRecent ? recent : results;
  const big = size === "lg";

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`flex items-stretch overflow-hidden rounded-xl border bg-panel/90 backdrop-blur transition focus-within:border-gold/60 ${
          error ? "border-loss/70" : "border-line"
        } ${big ? "h-14" : "h-10"}`}
      >
        <label className="relative flex shrink-0 items-center border-r border-line">
          <span className="sr-only">Server</span>
          <select
            value={server}
            onChange={(e) => chooseServer(e.target.value)}
            className={`h-full cursor-pointer appearance-none bg-transparent pr-7 font-display font-semibold text-gold outline-none ${
              big ? "pl-4 text-sm" : "pl-3 text-xs"
            }`}
          >
            {SERVERS.map((s) => (
              <option key={s.id} value={s.id} className="bg-panel text-text">
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-gold-dim" />
        </label>
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("search_placeholder")}
          aria-label={t("search_placeholder")}
          spellCheck={false}
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent px-3 text-text outline-none placeholder:text-faint ${big ? "text-base" : "text-sm"}`}
        />
        <button
          type="submit"
          aria-label={t("search_go")}
          className={`flex shrink-0 items-center justify-center text-ink transition hover:brightness-110 ${
            big ? "w-14 bg-gold" : "w-10 bg-gold/90"
          }`}
        >
          <Search className={big ? "h-5 w-5" : "h-4 w-4"} />
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-loss">{error}</p>}

      {open && (list.length > 0 || (!showRecent && !loading)) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/60">
          {showRecent && (
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
              <span>{t("search_recent")}</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {}
                  setRecent([]);
                }}
                className="normal-case tracking-normal text-muted hover:text-text"
              >
                {t("search_clear")}
              </button>
            </div>
          )}
          {list.length === 0 && <p className="px-4 py-3 text-sm text-muted">{t("search_no_results")}</p>}
          <ul className="max-h-80 overflow-y-auto py-1">
            {list.map((p, i) => {
              const s = p as SearchSuggestion;
              return (
                <li key={`${p.server}:${p.name}#${p.tag}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(p.name, p.tag, p.server)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? "bg-panel-2" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.profileIcon(version, p.profileIconId)} alt="" className="h-8 w-8 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">
                        {p.name}
                        <span className="text-faint"> #{p.tag}</span>
                      </span>
                      {!showRecent && (
                        <span className="block text-xs text-muted">
                          {s.tier ? `${s.tier[0]}${s.tier.slice(1).toLowerCase()} ${s.rank ?? ""}` : `${t("level")} ${s.level}`}
                        </span>
                      )}
                    </span>
                    <span className="rounded bg-ink px-1.5 py-0.5 font-display text-[10px] font-semibold text-gold">
                      {p.server.toUpperCase()}
                    </span>
                    {showRecent && (
                      <span
                        role="button"
                        aria-label="remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = recent.filter((r) => r !== p);
                          setRecent(next);
                          try {
                            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
                          } catch {}
                        }}
                        className="text-faint hover:text-text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {!showRecent && <p className="border-t border-line px-3 py-2 text-[11px] text-faint">{t("search_hint")}</p>}
        </div>
      )}
    </div>
  );
}
