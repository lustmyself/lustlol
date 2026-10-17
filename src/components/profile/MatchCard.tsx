"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { riotIdToSlug } from "@/lib/riot/servers";
import { compact, duration, kdaColor, kdaRatio, queueKey } from "@/lib/format";
import { timeAgo, type DictKey } from "@/lib/i18n/dictionaries";
import type { MatchPlayer, MatchSummary } from "@/lib/riot/types";

export interface Assets {
  version: string;
  spells: Record<number, string>;
  runes: Record<number, string>;
}

function Icon({ src, size, className = "" }: { src: string | null; size: number; className?: string }) {
  if (!src) return <span className={`inline-block shrink-0 rounded bg-ink ${className}`} style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded ${className}`} />;
}

function Items({ items, version, size }: { items: number[]; version: string; size: number }) {
  return (
    <div className="flex gap-0.5">
      {items.map((id, i) => (
        <Icon key={i} src={id ? img.item(version, id) : null} size={size} className={i === 6 ? "ml-0.5 rounded-full" : ""} />
      ))}
    </div>
  );
}

function Loadout({ p, a, size }: { p: MatchPlayer; a: Assets; size: number }) {
  const spell = (id: number) => (a.spells[id] ? img.spell(a.version, a.spells[id]) : null);
  const rune = (id: number) => (a.runes[id] ? img.rune(a.runes[id]) : null);
  return (
    <div className="flex gap-0.5">
      <div className="flex flex-col gap-0.5">
        <Icon src={spell(p.spells[0])} size={size} />
        <Icon src={spell(p.spells[1])} size={size} />
      </div>
      <div className="flex flex-col gap-0.5">
        <Icon src={rune(p.keystone)} size={size} className="rounded-full bg-ink" />
        <Icon src={rune(p.secondaryStyle)} size={size} className="rounded-full bg-ink p-0.5" />
      </div>
    </div>
  );
}

function PlayerLink({ p, server, bold }: { p: MatchPlayer; server: string; bold?: boolean }) {
  if (p.name === "?") return <span className="truncate text-faint">?</span>;
  return (
    <Link
      href={`/summoner/${server}/${riotIdToSlug(p.name, p.tag)}`}
      className={`block min-w-0 truncate hover:underline ${bold ? "font-semibold text-text" : "text-muted"}`}
      title={`${p.name}#${p.tag}`}
    >
      {p.name}
    </Link>
  );
}

export function MatchCard({ match, puuid, server, assets }: { match: MatchSummary; puuid: string; server: string; assets: Assets }) {
  const { t, dict } = useI18n();
  const [open, setOpen] = useState(false);
  const me = match.players.find((p) => p.puuid === puuid);
  if (!me) return null;

  const result = match.remake ? "remake" : me.win ? "win" : "loss";
  const tone = {
    win: { bar: "bg-win", bg: "bg-win-bg/60", text: "text-win", label: t("victory") },
    loss: { bar: "bg-loss", bg: "bg-loss-bg/60", text: "text-loss", label: t("defeat") },
    remake: { bar: "bg-remake", bg: "bg-panel", text: "text-muted", label: t("remake") },
  }[result];

  const teamKills = match.players.filter((p) => p.teamId === me.teamId).reduce((s, p) => s + p.kills, 0);
  const kp = teamKills ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0;
  const minutes = match.duration / 60;
  const qk = queueKey(match.queueId);
  const multi = me.multiKill >= 2 ? (`multikill_${Math.min(me.multiKill, 5)}` as DictKey) : null;
  const teams = [100, 200].map((id) => match.players.filter((p) => p.teamId === id));

  return (
    <article className={`overflow-hidden rounded-xl border border-line/60 ${tone.bg}`}>
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${tone.bar}`} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3 p-3 sm:flex-nowrap">
          <div className="w-24 shrink-0 text-xs leading-5">
            <p className={`font-semibold ${tone.text}`}>{qk ? t(qk) : match.mode}</p>
            <p className="text-faint" suppressHydrationWarning>
              {timeAgo(dict, match.endedAt)}
            </p>
            <div className="my-1 h-px w-10 bg-line" />
            <p className="font-semibold text-text">{tone.label}</p>
            <p className="tabular text-faint">{duration(match.duration)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <Icon src={img.champion(assets.version, me.champion)} size={48} className="rounded-full" />
              <span className="tabular absolute -right-1 -bottom-1 rounded-full bg-ink px-1 text-[10px] text-muted">{me.championLevel}</span>
            </div>
            <Loadout p={me} a={assets} size={22} />
          </div>

          <div className="w-24 shrink-0 text-center">
            <p className="tabular font-display text-base font-bold">
              {me.kills} <span className="text-faint">/</span> <span className="text-loss">{me.deaths}</span> <span className="text-faint">/</span>{" "}
              {me.assists}
            </p>
            <p className={`tabular text-xs font-semibold ${kdaColor(me.kills, me.deaths, me.assists)}`}>
              {kdaRatio(me.kills, me.deaths, me.assists)} {t("kda")}
            </p>
            {multi && <p className="mt-1 inline-block rounded-full bg-loss/20 px-2 text-[10px] font-semibold text-loss">{t(multi)}</p>}
          </div>

          <div className="hidden w-28 shrink-0 text-xs leading-5 text-muted md:block">
            <p>
              {t("kill_participation")} <span className="tabular text-text">{kp}%</span>
            </p>
            <p>
              {t("cs")} <span className="tabular text-text">{me.cs}</span> ({(me.cs / minutes).toFixed(1)})
            </p>
            <p>
              {t("vision")} <span className="tabular text-text">{me.vision}</span>
            </p>
          </div>

          <Items items={me.items} version={assets.version} size={24} />

          <div className="ml-auto hidden w-[13.5rem] shrink-0 grid-cols-2 gap-x-2 text-[11px] lg:grid">
            {teams.map((team, ti) => (
              <ul key={ti} className="min-w-0 space-y-px">
                {team.map((p) => (
                  <li key={p.puuid} className="flex min-w-0 items-center gap-1">
                    <Icon src={img.champion(assets.version, p.champion)} size={15} />
                    <PlayerLink p={p} server={server} bold={p.puuid === puuid} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t("details")}
          className={`flex w-9 shrink-0 items-end justify-center pb-3 transition hover:bg-white/5 ${tone.text}`}
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && <MatchDetails match={match} puuid={puuid} server={server} assets={assets} />}
    </article>
  );
}

function MatchDetails({ match, puuid, server, assets }: { match: MatchSummary; puuid: string; server: string; assets: Assets }) {
  const { t } = useI18n();
  const maxDamage = Math.max(...match.players.map((p) => p.damage), 1);
  const minutes = match.duration / 60;

  return (
    <div className="space-y-3 border-t border-line/60 bg-ink/40 p-3">
      {[100, 200].map((teamId) => {
        const team = match.teams.find((x) => x.teamId === teamId);
        const players = match.players.filter((p) => p.teamId === teamId);
        const blue = teamId === 100;
        return (
          <div key={teamId} className="overflow-x-auto">
            <div className="mb-1.5 flex items-center gap-3 text-xs">
              <span className={`font-semibold ${team?.win ? "text-win" : "text-loss"}`}>
                {team?.win ? t("victory") : t("defeat")}
              </span>
              <span className="text-muted">{blue ? t("blue_team") : t("red_team")}</span>
              {team && (
                <span className="tabular ml-auto text-faint">
                  {team.kills} K · {team.towers} {t("towers")} · {team.dragons} {t("dragons")} · {team.barons} {t("barons")}
                </span>
              )}
            </div>
            <table className="w-full min-w-[640px] text-xs">
              <tbody>
                {players.map((p) => (
                  <tr key={p.puuid} className={p.puuid === puuid ? "bg-white/5" : ""}>
                    <td className="py-1 pl-1">
                      <div className="flex items-center gap-2">
                        <Icon src={img.champion(assets.version, p.champion)} size={30} className="rounded-full" />
                        <Loadout p={p} a={assets} size={14} />
                        <div className="flex w-32 min-w-0 flex-col">
                          <PlayerLink p={p} server={server} bold={p.puuid === puuid} />
                          <span className="text-[10px] text-faint">#{p.tag}</span>
                        </div>
                      </div>
                    </td>
                    <td className="tabular w-28 text-center">
                      <span>
                        {p.kills}/{p.deaths}/{p.assists}
                      </span>
                      <span className={`ml-1.5 ${kdaColor(p.kills, p.deaths, p.assists)}`}>{kdaRatio(p.kills, p.deaths, p.assists)}</span>
                    </td>
                    <td className="w-32">
                      <div className="tabular text-center text-muted">{compact(p.damage)}</div>
                      <div className="mx-auto mt-0.5 h-1.5 w-20 overflow-hidden rounded-full bg-ink">
                        <div className={blue ? "h-full bg-win" : "h-full bg-loss"} style={{ width: `${(p.damage / maxDamage) * 100}%` }} />
                      </div>
                    </td>
                    <td className="tabular w-16 text-center text-muted" title={t("gold")}>
                      {compact(p.gold)}
                    </td>
                    <td className="tabular w-20 text-center text-muted">
                      {p.cs} <span className="text-faint">({(p.cs / minutes).toFixed(1)})</span>
                    </td>
                    <td className="tabular w-10 text-center text-muted" title={t("vision")}>
                      {p.vision}
                    </td>
                    <td className="w-48 pr-1">
                      <Items items={p.items} version={assets.version} size={20} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
