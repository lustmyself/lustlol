"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { riotIdToSlug } from "@/lib/riot/servers";
import { TIER_COLORS, compact, duration, kdaColor, kdaRatio, queueKey, rankEmblem, rankLabel, winrateColor } from "@/lib/format";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { LiveDetails, LiveGame as Game, LivePlayer } from "@/lib/riot/live";
import type { ApiErrorCode } from "@/lib/riot/types";
import type { Assets } from "./MatchCard";

const SMITE = 11;

function Img({ src, size, className = "" }: { src: string | null; size: number; className?: string }) {
  if (!src) return <span className={`inline-block shrink-0 rounded bg-ink ${className}`} style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className={`shrink-0 rounded ${className}`} />;
}

function Emblem({ tier }: { tier: string }) {
  return (
    <span className="relative inline-block h-12 w-14 shrink-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rankEmblem(tier)} alt="" className="absolute top-1/2 left-1/2 h-auto max-w-none -translate-x-1/2 -translate-y-1/2" style={{ width: 216 }} />
    </span>
  );
}

/** Positive verdicts only, from mastery. */
function liveTags(d: LiveDetails, champ: string, t: (k: DictKey, v?: Record<string, string | number>) => string): string[] {
  const tags: string[] = [];
  if (d.mastery && d.mastery.points >= 1_000_000) tags.push(t("live_tag_millionaire", { c: champ }));
  if (d.masteryShare >= 0.4 && d.mastery && d.mastery.points >= 100_000) tags.push(t("live_tag_otp", { c: champ }));
  if (d.played12h >= 8) tags.push(t("live_tag_grinding"));
  return tags;
}

function PlayerCard({
  p,
  d,
  me,
  server,
  assets,
}: {
  p: LivePlayer;
  d: LiveDetails | null | undefined;
  me: boolean;
  server: string;
  assets: Assets;
}) {
  const { t } = useI18n();
  const champ = assets.byKey[p.championId];
  const champName = champ ? assets.names[champ] ?? champ : "";
  const spell = (id: number) => (assets.spells[id] ? img.spell(assets.version, assets.spells[id]) : null);
  const rune = (id: number) => (assets.runes[id] ? img.rune(assets.runes[id]) : null);
  const border = p.teamId === 100 ? "border-t-win" : "border-t-loss";

  if (p.name === "?") {
    return (
      <div className={`overflow-hidden rounded-lg border border-line/60 border-t-2 bg-panel ${border}`}>
        <p className="border-b border-line/60 px-3 py-2 text-center text-sm font-semibold">{champName}</p>
        <p className="p-3 text-xs leading-relaxed text-muted">{t("live_hidden")}</p>
      </div>
    );
  }

  const games = d?.onChampion.games ?? 0;
  const wr = games ? Math.round((d!.onChampion.wins / games) * 100) : null;
  const soloGames = d?.solo ? d.solo.wins + d.solo.losses : 0;
  const soloWr = soloGames ? Math.round((d!.solo!.wins / soloGames) * 100) : 0;
  const tags = d ? liveTags(d, champName, t) : [];

  return (
    <div className={`overflow-hidden rounded-lg border border-line/60 border-t-2 bg-panel ${border} ${me ? "ring-1 ring-gold/60" : ""}`}>
      <Link
        href={`/summoner/${server}/${riotIdToSlug(p.name, p.tag)}`}
        className={`block truncate border-b border-line/60 px-3 py-2 text-center text-sm font-semibold hover:underline ${me ? "text-gold" : "text-text"}`}
        title={`${p.name}#${p.tag}`}
      >
        {p.name}
        <span className="font-normal text-faint">#{p.tag}</span>
      </Link>

      {/* Champion */}
      <div className="flex gap-2.5 border-b border-line/40 p-3">
        <div className="shrink-0">
          <Img src={champ ? img.champion(assets.version, champ) : null} size={48} className="rounded-lg" />
          <div className="mt-1 flex gap-0.5">
            <Img src={rune(p.keystone)} size={15} className="rounded-full bg-ink" />
            <Img src={spell(p.spells[0])} size={15} />
            <Img src={spell(p.spells[1])} size={15} />
          </div>
        </div>
        <div className="min-w-0 text-xs leading-5">
          {d === undefined ? (
            <div className="skeleton mt-1 h-10 w-24" />
          ) : wr !== null ? (
            <>
              <p>
                <span className={`font-semibold ${winrateColor(wr)}`}>
                  {wr}% {t("live_win")}
                </span>{" "}
                <span className="text-faint">({t("games_count", { n: games })})</span>
              </p>
              <p className="tabular">
                <span className="text-buff">{(d!.onChampion.kills / games).toFixed(1)}</span>
                <span className="text-faint"> / </span>
                <span className="text-nerf">{(d!.onChampion.deaths / games).toFixed(1)}</span>
                <span className="text-faint"> / </span>
                <span className="text-adjust">{(d!.onChampion.assists / games).toFixed(1)}</span>
                <span className={`ml-1 ${kdaColor(d!.onChampion.kills, d!.onChampion.deaths, d!.onChampion.assists)}`}>
                  {kdaRatio(d!.onChampion.kills, d!.onChampion.deaths, d!.onChampion.assists)}
                </span>
              </p>
            </>
          ) : (
            <p className="text-faint">{t("live_no_games")}</p>
          )}
          {d?.mastery && (
            <p className="text-muted">
              {t("mastery_short")} {d.mastery.level} · {compact(d.mastery.points)}
            </p>
          )}
        </div>
      </div>

      {/* Rank */}
      <div className="flex items-center gap-2 border-b border-line/40 px-3 py-2">
        {d?.solo ? (
          <>
            <Emblem tier={d.solo.tier} />
            <div className="min-w-0 text-xs leading-5">
              <p>
                <span className="font-semibold" style={{ color: TIER_COLORS[d.solo.tier] }}>
                  {rankLabel(d.solo.tier, d.solo.rank)}
                </span>{" "}
                <span className="tabular text-muted">{d.solo.leaguePoints} LP</span>
              </p>
              <p className="tabular text-faint">
                <span className={winrateColor(soloWr)}>{soloWr}%</span> ({t("games_count", { n: soloGames })})
              </p>
            </div>
          </>
        ) : (
          <p className="py-2 text-xs text-faint">{d === undefined ? "…" : t("unranked")}</p>
        )}
      </div>

      {/* Role and recent activity */}
      <div className="grid grid-cols-2 border-b border-line/40 text-xs">
        <div className="border-r border-line/40 px-3 py-2">
          <p className="font-display text-xl leading-none font-bold text-faint">
            12<sup className="text-[10px]">{t("hour_short")}</sup>
          </p>
          <p className="mt-1 text-muted">{d ? t("games_count", { n: d.played12h }) : "…"}</p>
        </div>
        <div className="px-3 py-2">
          <p className="font-display text-xl leading-none font-bold text-faint">
            30<sup className="text-[10px]">{t("day_short")}</sup>
          </p>
          <p className="mt-1 text-muted">{d ? t("games_count", { n: d.played30d >= 100 ? "100+" : d.played30d }) : "…"}</p>
        </div>
      </div>

      <div className="flex min-h-10 flex-wrap justify-center gap-1.5 p-2.5">
        {p.spells.includes(SMITE) && (
          <span className="rounded-md border border-adjust/40 px-2 py-0.5 text-[11px] text-adjust">{t("live_jungler")}</span>
        )}
        {tags.map((tag) => (
          <span key={tag} className="rounded-md border border-buff/40 bg-buff/10 px-2 py-0.5 text-[11px] font-medium text-buff">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LiveGamePanel({ server, puuid, assets }: { server: string; puuid: string; assets: Assets }) {
  const { t } = useI18n();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [details, setDetails] = useState<(LiveDetails | null)[] | undefined>(undefined);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`/api/live?server=${server}&puuid=${encodeURIComponent(puuid)}`);
        const body = await res.json();
        if (stop) return;
        if (!res.ok) return setError(body.error ?? "unavailable");
        setGame(body.game);
        if (!body.game) return;
        // Second call for the slower per-player lookups, so the teams show right away.
        const champions = (body.game as Game).players.map((p) => assets.byKey[p.championId] ?? "").join(",");
        const more = await fetch(`/api/live?server=${server}&puuid=${encodeURIComponent(puuid)}&details=1&champions=${encodeURIComponent(champions)}`);
        const full = await more.json();
        if (!stop && more.ok) setDetails(full.details);
      } catch {
        if (!stop) setError("unavailable");
      }
    })();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      clearInterval(tick);
    };
  }, [server, puuid, assets.byKey]);

  if (error) return <p className="mt-8 text-center text-sm text-loss">{t(`err_${error}` as DictKey)}</p>;
  if (game === undefined)
    return (
      <div className="flex justify-center py-16 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (game === null) return <p className="mt-10 rounded-xl border border-line/70 bg-panel p-8 text-center text-sm text-muted">{t("live_none")}</p>;

  const qk = queueKey(game.queueId);
  const bans = (teamId: number) => game.bans.filter((b) => b.teamId === teamId);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-loss/15 px-2 py-0.5 text-xs text-loss">
            <span className="h-2 w-2 animate-pulse rounded-full bg-loss" />
            {t("live")}
          </span>
          {qk ? t(qk) : game.mode}
          <span className="tabular text-lg font-normal text-muted">
            ({game.startedAt ? duration(Math.max(0, Math.floor((now - game.startedAt) / 1000))) : t("live_loading")})
          </span>
        </h2>
        {game.bans.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-faint">{t("bans")}</span>
            {[100, 200].map((teamId) => (
              <div key={teamId} className={`flex gap-1 ${teamId === 200 ? "ml-3" : ""}`}>
                {bans(teamId).map((b, j) => {
                  const id = assets.byKey[b.championId];
                  return <Img key={j} src={id ? img.champion(assets.version, id) : null} size={26} className="rounded opacity-80 grayscale" />;
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {[100, 200].map((teamId) => (
        <section key={teamId}>
          <p className={`mb-2 text-xs font-semibold tracking-wider uppercase ${teamId === 100 ? "text-win" : "text-loss"}`}>
            {teamId === 100 ? t("blue_team") : t("red_team")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {game.players.map((p, i) =>
              p.teamId === teamId ? (
                <PlayerCard key={p.puuid || i} p={p} d={details === undefined ? undefined : details[i]} me={p.puuid === puuid} server={server} assets={assets} />
              ) : null,
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
