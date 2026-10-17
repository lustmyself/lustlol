"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { kdaColor, kdaRatio, winrateColor } from "@/lib/format";
import { riotIdToSlug } from "@/lib/riot/servers";
import type { ChampionLine, SeasonStats } from "@/lib/riot/sync";

const TABS = [
  { id: 0, key: "all_ranked" },
  { id: 420, key: "queue_solo" },
  { id: 440, key: "queue_flex" },
] as const;

const SHORT = 8;

/** Season stats for a player, polled while the background sync is running. */
export function useSeasonStats(server: string, puuid: string): SeasonStats | null {
  const [data, setData] = useState<SeasonStats | null>(null);
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
  return data;
}

export function SeasonChampions({
  data,
  server,
  version,
  names,
}: {
  data: SeasonStats | null;
  server: string;
  version: string;
  names: Record<string, string>;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState(0);
  const [all, setAll] = useState(false);

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
  const maxGames = Math.max(1, ...rows.map((r) => r.games));
  const pct = data && data.total ? Math.round((data.fetched / data.total) * 100) : 0;

  return (
    <>
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

        {shown.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_7.5rem_7.5rem] gap-3 px-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
            <span>{t("champion")}</span>
            <span>{t("played")}</span>
            <span>{t("winrate")}</span>
          </div>
        )}
        <ul className="space-y-2.5">
          {shown.map((c) => {
            const wr = Math.round((c.wins / c.games) * 100);
            return (
              <li key={c.champion} className="grid grid-cols-[minmax(0,1fr)_7.5rem_7.5rem] items-center gap-3 px-1 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.champion(version, c.champion)} alt="" className="h-10 w-10 shrink-0 rounded-lg" loading="lazy" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{names[c.champion] ?? c.champion}</p>
                    <p className="tabular font-semibold">
                      <span className="text-buff">{(c.kills / c.games).toFixed(1)}</span>
                      <span className="text-faint"> / </span>
                      <span className="text-nerf">{(c.deaths / c.games).toFixed(1)}</span>
                      <span className="text-faint"> / </span>
                      <span className="text-adjust">{(c.assists / c.games).toFixed(1)}</span>
                      <span className={`ml-1.5 font-normal ${kdaColor(c.kills, c.deaths, c.assists)}`}>
                        {kdaRatio(c.kills, c.deaths, c.assists)}
                      </span>
                    </p>
                    <p className="tabular text-[11px] text-faint">
                      {(c.cs / c.minutes).toFixed(1)} {t("cs")}
                      {t("per_min")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
                    <div className="h-full rounded-full bg-teal" style={{ width: `${(c.games / maxGames) * 100}%` }} />
                  </div>
                  <span className="tabular w-7 text-right font-semibold text-text">{c.games}</span>
                </div>
                <div className="flex items-center gap-2" title={t("wins_losses", { w: c.wins, l: c.games - c.wins })}>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
                    <div className={`h-full rounded-full ${wr >= 50 ? "bg-win" : "bg-loss"}`} style={{ width: `${wr}%` }} />
                  </div>
                  <span className={`tabular w-10 text-right font-semibold ${winrateColor(wr)}`}>{wr}%</span>
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

    <section className="rounded-xl border border-line/70 bg-panel">
      <header className="flex items-baseline justify-between gap-2 border-b border-line/70 px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold tracking-wide">{t("duo_title")}</h2>
        <span className="text-[11px] text-faint">{t("duo_note")}</span>
      </header>
      <div className="p-3">
        {!data && <div className="skeleton h-16" />}
        {data && data.duos.length === 0 && <p className="text-xs text-muted">{data.syncing ? t("duo_waiting") : t("duo_none")}</p>}
        <ul className="space-y-2">
          {data?.duos.map((d) => {
            const wr = Math.round((d.wins / d.games) * 100);
            return (
              <li key={d.puuid} className="flex items-center gap-2.5 text-xs">
                {d.name ? (
                  <Link href={`/summoner/${server}/${riotIdToSlug(d.name, d.tag)}`} className="min-w-0 flex-1 truncate font-semibold text-text hover:underline">
                    {d.name}
                    <span className="font-normal text-faint">#{d.tag}</span>
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 text-faint">?</span>
                )}
                <span className="tabular text-muted">{t("games_count", { n: d.games })}</span>
                <span className="tabular w-16 text-right text-faint">{t("wins_losses", { w: d.wins, l: d.games - d.wins })}</span>
                <span className={`tabular w-10 text-right font-semibold ${winrateColor(wr)}`}>{wr}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
    </>
  );
}
