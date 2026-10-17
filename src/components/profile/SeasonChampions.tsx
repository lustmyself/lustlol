"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { kdaColor, kdaRatio, winrateColor } from "@/lib/format";
import type { ChampionLine, SeasonStats } from "@/lib/riot/sync";

const TABS = [
  { id: 0, key: "all_ranked" },
  { id: 420, key: "queue_solo" },
  { id: 440, key: "queue_flex" },
] as const;

const SHORT = 8;

export function SeasonChampions({
  server,
  puuid,
  version,
  names,
}: {
  server: string;
  puuid: string;
  version: string;
  names: Record<string, string>;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<SeasonStats | null>(null);
  const [tab, setTab] = useState(0);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`/api/season-stats?server=${server}&puuid=${encodeURIComponent(puuid)}`);
        if (res.ok) {
          const body = (await res.json()) as SeasonStats;
          if (stop) return;
          setData(body);
          if (body.syncing) timer = setTimeout(poll, 4000);
        }
      } catch {
        if (!stop) timer = setTimeout(poll, 8000);
      }
    }
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [server, puuid]);

  const rows = useMemo(() => {
    const merged = new Map<string, ChampionLine>();
    for (const l of data?.champions ?? []) {
      if (tab && l.queueId !== tab) continue;
      const m = merged.get(l.champion);
      if (!m) merged.set(l.champion, { ...l });
      else for (const k of ["games", "wins", "kills", "deaths", "assists", "cs", "minutes"] as const) m[k] += l[k];
    }
    return [...merged.values()].sort((a, b) => b.games - a.games || b.wins - a.wins);
  }, [data, tab]);

  const shown = all ? rows : rows.slice(0, SHORT);
  const pct = data && data.total ? Math.round((data.fetched / data.total) * 100) : 0;

  return (
    <section className="rounded-xl border border-line/70 bg-panel">
      <header className="flex items-baseline justify-between gap-2 border-b border-line/70 px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold tracking-wide">{t("season_champs")}</h2>
        <span className="text-[11px] text-faint">{t("season_champs_note")}</span>
      </header>

      <div className="space-y-3 p-3">
        <div className="flex gap-1">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`rounded-md px-2.5 py-1 text-xs ${tab === x.id ? "bg-panel-2 text-gold" : "text-muted hover:text-text"}`}
            >
              {t(x.key)}
            </button>
          ))}
        </div>

        {data?.syncing && (
          <div>
            <div className="flex justify-between text-[11px] text-muted">
              <span>{t("season_sync", { f: data.fetched, t: data.total || "…" })}</span>
              <span className="tabular">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-faint">{t("season_sync_note")}</p>
          </div>
        )}

        {!data && <div className="skeleton h-40" />}
        {data && !data.syncing && rows.length === 0 && <p className="text-xs text-muted">{t("season_champs_empty")}</p>}

        <ul className="space-y-2">
          {shown.map((c) => {
            const wr = Math.round((c.wins / c.games) * 100);
            return (
              <li key={c.champion} className="flex items-center gap-2.5 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.champion(version, c.champion)} alt="" className="h-8 w-8 shrink-0 rounded-full" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{names[c.champion] ?? c.champion}</p>
                  <p className="tabular text-faint">
                    {(c.cs / c.minutes).toFixed(1)} {t("cs")}
                    {t("per_min")}
                  </p>
                </div>
                <div className="w-20 shrink-0 text-center">
                  <p className={`tabular font-semibold ${kdaColor(c.kills, c.deaths, c.assists)}`}>{kdaRatio(c.kills, c.deaths, c.assists)}</p>
                  <p className="tabular text-faint">
                    {(c.kills / c.games).toFixed(1)}/{(c.deaths / c.games).toFixed(1)}/{(c.assists / c.games).toFixed(1)}
                  </p>
                </div>
                <div className="w-16 shrink-0 text-right whitespace-nowrap">
                  <p className={`tabular font-semibold ${winrateColor(wr)}`}>{wr}%</p>
                  <p className="tabular text-faint">{t("wins_losses", { w: c.wins, l: c.games - c.wins })}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length > SHORT && (
          <button type="button" onClick={() => setAll((a) => !a)} className="w-full rounded-md py-1.5 text-xs text-muted hover:bg-panel-2 hover:text-text">
            {all ? t("show_less") : t("show_all", { n: rows.length })}
          </button>
        )}
      </div>
    </section>
  );
}
