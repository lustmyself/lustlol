"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { MatchCard, type Assets } from "./MatchCard";
import { SeasonChampions } from "./SeasonChampions";
import { QUEUE_IDS, riotIdToSlug } from "@/lib/riot/servers";
import { kdaColor, kdaRatio, winrateColor } from "@/lib/format";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { ApiErrorCode, MatchPage, MatchSummary } from "@/lib/riot/types";

const PAGE = 10;
const FILTERS = [0, 420, 440, 400, 450, 1700];

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line/70 bg-panel">
      <header className="flex items-baseline justify-between gap-2 border-b border-line/70 px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold tracking-wide">{title}</h2>
        {note && <span className="text-[11px] text-faint">{note}</span>}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function ProfileBody({
  puuid,
  server,
  assets,
  initial,
  initialError,
  sidebar,
}: {
  puuid: string;
  server: string;
  assets: Assets;
  initial: MatchPage | null;
  initialError: ApiErrorCode | null;
  sidebar: React.ReactNode;
}) {
  const { t } = useI18n();
  const [queue, setQueue] = useState(0);
  const [matches, setMatches] = useState<MatchSummary[]>(initial?.matches ?? []);
  const [next, setNext] = useState<number | null>(initial?.next ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(initialError);

  async function load(q: number, start: number) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ server, puuid, start: String(start), count: String(PAGE) });
      if (q) params.set("queue", String(q));
      const res = await fetch(`/api/matches?${params}`);
      const body = await res.json();
      if (!res.ok) throw body.error ?? "unavailable";
      const page = body as MatchPage;
      setMatches((prev) => {
        const base = start === 0 ? [] : prev;
        const seen = new Set(base.map((m) => m.id));
        return [...base, ...page.matches.filter((m) => !seen.has(m.id))];
      });
      setNext(page.next);
    } catch (e) {
      setError(typeof e === "string" ? (e as ApiErrorCode) : "unavailable");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => summarize(matches, puuid), [matches, puuid]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        {sidebar}

        <SeasonChampions server={server} puuid={puuid} version={assets.version} names={assets.names} />

        {matches.length > 0 && (
          <Panel title={t("duo_title")} note={t("duo_note")}>
            {stats.duos.length === 0 ? (
              <p className="text-xs text-muted">{t("duo_none")}</p>
            ) : (
              <ul className="space-y-2">
                {stats.duos.slice(0, 6).map((d) => (
                  <li key={d.puuid} className="flex items-center gap-2.5 text-xs">
                    <Link
                      href={`/summoner/${server}/${riotIdToSlug(d.name, d.tag)}`}
                      className="min-w-0 flex-1 truncate font-semibold text-text hover:underline"
                    >
                      {d.name}
                      <span className="font-normal text-faint"> #{d.tag}</span>
                    </Link>
                    <span className="tabular text-faint">
                      {t("wins_losses", { w: d.wins, l: d.games - d.wins })}
                    </span>
                    <span className={`tabular w-10 text-right font-semibold ${winrateColor((d.wins / d.games) * 100)}`}>
                      {Math.round((d.wins / d.games) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </aside>

      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 font-display text-lg font-semibold">{t("matches")}</h2>
          {FILTERS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => {
                setQueue(q);
                void load(q, 0);
              }}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                queue === q ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-text"
              }`}
            >
              {q === 0 ? t("all_queues") : t(QUEUE_IDS[q] as DictKey)}
            </button>
          ))}
        </div>

        {stats.games > 0 && <FormStrip stats={stats} />}

        {error && (
          <div className="rounded-xl border border-loss/40 bg-loss-bg/60 p-4 text-sm text-loss">
            {t(`err_${error}` as DictKey)}{" "}
            <button type="button" className="underline" onClick={() => load(queue, matches.length && next ? next : 0)}>
              {t("try_again")}
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <p className="rounded-xl border border-line/70 bg-panel p-6 text-center text-sm text-muted">{t("no_matches")}</p>
        )}

        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} puuid={puuid} server={server} assets={assets} />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-4 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && next !== null && matches.length > 0 && (
          <button
            type="button"
            onClick={() => load(queue, next)}
            className="w-full rounded-xl border border-line bg-panel py-3 text-sm text-muted transition hover:border-gold/50 hover:text-gold"
          >
            {t("load_more")}
          </button>
        )}
      </section>
    </div>
  );
}

function FormStrip({ stats }: { stats: Stats }) {
  const { t } = useI18n();
  const wr = Math.round((stats.wins / stats.games) * 100);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line/70 bg-panel px-4 py-3">
      <div className="text-xs text-muted">
        <p>{t("recent_form", { n: stats.games })}</p>
        <p className="tabular">
          {t("wins_losses", { w: stats.wins, l: stats.games - stats.wins })} ·{" "}
          <span className={`font-semibold ${winrateColor(wr)}`}>{wr}%</span>
        </p>
      </div>
      <div className="text-xs">
        <p className="tabular font-display text-base font-bold">
          {(stats.k / stats.games).toFixed(1)} / <span className="text-loss">{(stats.d / stats.games).toFixed(1)}</span> /{" "}
          {(stats.a / stats.games).toFixed(1)}
        </p>
        <p className={`tabular font-semibold ${kdaColor(stats.k, stats.d, stats.a)}`}>
          {kdaRatio(stats.k, stats.d, stats.a)} {t("kda")}
        </p>
      </div>
      <div className="ml-auto flex gap-1" aria-hidden>
        {stats.form.slice(0, 20).map((w, i) => (
          <span key={i} className={`h-6 w-1.5 rounded-full ${w ? "bg-win" : "bg-loss"}`} />
        ))}
      </div>
    </div>
  );
}

interface Stats {
  games: number;
  wins: number;
  k: number;
  d: number;
  a: number;
  form: boolean[];
  duos: { puuid: string; name: string; tag: string; games: number; wins: number }[];
}

function summarize(matches: MatchSummary[], puuid: string): Stats {
  const s: Stats = { games: 0, wins: 0, k: 0, d: 0, a: 0, form: [], duos: [] };
  const duos = new Map<string, Stats["duos"][number]>();

  for (const m of matches) {
    if (m.remake) continue;
    const me = m.players.find((p) => p.puuid === puuid);
    if (!me) continue;
    s.games++;
    s.wins += me.win ? 1 : 0;
    s.k += me.kills;
    s.d += me.deaths;
    s.a += me.assists;
    s.form.push(me.win);


    for (const p of m.players) {
      if (p.teamId !== me.teamId || p.puuid === puuid || p.name === "?") continue;
      const d = duos.get(p.puuid) ?? { puuid: p.puuid, name: p.name, tag: p.tag, games: 0, wins: 0 };
      d.games++;
      d.wins += me.win ? 1 : 0;
      duos.set(p.puuid, d);
    }
  }

  s.duos = [...duos.values()].filter((d) => d.games >= 2).sort((a, b) => b.games - a.games || b.wins - a.wins);
  return s;
}
