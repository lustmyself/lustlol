"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { riotIdToSlug } from "@/lib/riot/servers";
import { compact, duration, kdaColor, kdaRatio, queueKey } from "@/lib/format";
import { timeAgo, type DictKey } from "@/lib/i18n/dictionaries";
import { performanceTags } from "@/lib/tags";
import type { MatchPlayer, MatchSummary } from "@/lib/riot/types";

export interface Assets {
  version: string;
  spells: Record<number, string>;
  runes: Record<number, string>;
  /** Data Dragon id -> display name, e.g. "MonkeyKing" -> "Wukong" */
  names: Record<string, string>;
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

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const roleIcon = (role: string) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${role.toLowerCase()}.png`;

function byRole(team: MatchPlayer[]): MatchPlayer[] {
  if (!team.every((p) => ROLES.includes(p.position))) return team;
  return [...team].sort((a, b) => ROLES.indexOf(a.position) - ROLES.indexOf(b.position));
}

function Stat({ big, small, className = "" }: { big: React.ReactNode; small: React.ReactNode; className?: string }) {
  return (
    <div className={`shrink-0 text-center ${className}`}>
      <p className="tabular font-display text-base font-bold whitespace-nowrap">{big}</p>
      <p className="tabular text-[11px] whitespace-nowrap text-muted">{small}</p>
    </div>
  );
}

function TeamName({ p, server, me, align }: { p: MatchPlayer; server: string; me: boolean; align: "left" | "right" }) {
  const { t } = useI18n();
  const side = align === "right" ? "text-right" : "";
  if (me) return <span className={`truncate font-semibold text-gold ${side}`}>{t("you")}</span>;
  if (p.name === "?") return <span className={`truncate text-faint ${side}`}>?</span>;
  return (
    <Link
      href={`/summoner/${server}/${riotIdToSlug(p.name, p.tag)}`}
      className={`min-w-0 truncate text-muted hover:text-text hover:underline ${side}`}
      title={`${p.name}#${p.tag}`}
    >
      {p.name}
      <span className="text-faint">#{p.tag}</span>
    </Link>
  );
}

function Lanes({ match, puuid, server, version }: { match: MatchSummary; puuid: string; server: string; version: string }) {
  const blue = byRole(match.players.filter((p) => p.teamId === 100));
  const red = byRole(match.players.filter((p) => p.teamId === 200));
  return (
    <ul className="space-y-1 text-[11px]">
      {blue.map((b, i) => {
        const r = red[i];
        return (
          <li key={b.puuid} className="grid grid-cols-[minmax(0,1fr)_20px_14px_20px_minmax(0,1fr)] items-center gap-1.5">
            <TeamName p={b} server={server} me={b.puuid === puuid} align="right" />
            <Icon src={img.champion(version, b.champion)} size={20} className={b.puuid === puuid ? "ring-2 ring-gold" : ""} />
            {ROLES.includes(b.position) ? <Icon src={roleIcon(b.position)} size={14} className="opacity-60" /> : <span />}
            {r ? <Icon src={img.champion(version, r.champion)} size={20} className={r.puuid === puuid ? "ring-2 ring-gold" : ""} /> : <span />}
            {r ? <TeamName p={r} server={server} me={r.puuid === puuid} align="left" /> : <span />}
          </li>
        );
      })}
    </ul>
  );
}

/** Arena: pairs in finishing order. */
function Pairs({ match, puuid, server, version }: { match: MatchSummary; puuid: string; server: string; version: string }) {
  const pairs = new Map<number, MatchPlayer[]>();
  for (const p of match.players) pairs.set(p.subteam ?? 0, [...(pairs.get(p.subteam ?? 0) ?? []), p]);
  const sorted = [...pairs.values()].sort((a, b) => (a[0].placement ?? 99) - (b[0].placement ?? 99));
  return (
    <ul className="grid grid-cols-3 gap-1 text-[11px]">
      {sorted.map((pair) => {
        const mine = pair.some((p) => p.puuid === puuid);
        return (
          <li
            key={pair[0].subteam ?? pair[0].puuid}
            className={`flex items-center gap-1 rounded-md px-1.5 py-1 ${mine ? "bg-gold/15 ring-1 ring-gold/50" : "bg-ink/40"}`}
          >
            <span className="tabular w-4 text-faint">{pair[0].placement}</span>
            {pair.map((p) => (
              <Link key={p.puuid} href={`/summoner/${server}/${riotIdToSlug(p.name, p.tag)}`} title={`${p.name}#${p.tag}`}>
                <Icon src={img.champion(version, p.champion)} size={20} />
              </Link>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

export function MatchCard({ match, puuid, server, assets }: { match: MatchSummary; puuid: string; server: string; assets: Assets }) {
  const { t, dict } = useI18n();
  const [open, setOpen] = useState(false);
  const me = match.players.find((p) => p.puuid === puuid);
  if (!me) return null;

  const arena = match.mode === "CHERRY";
  const result = match.remake ? "remake" : me.win ? "win" : "loss";
  const tone = {
    win: { bar: "bg-win", bg: "bg-win-bg/60", text: "text-win", label: t("victory") },
    loss: { bar: "bg-loss", bg: "bg-loss-bg/60", text: "text-loss", label: t("defeat") },
    remake: { bar: "bg-remake", bg: "bg-panel", text: "text-muted", label: t("remake") },
  }[result];
  const label = arena && me.placement ? t("placement", { n: me.placement }) : tone.label;

  const allies = arena ? match.players.filter((p) => p.subteam === me.subteam) : match.players.filter((p) => p.teamId === me.teamId);
  const teamKills = allies.reduce((s, p) => s + p.kills, 0);
  const kp = teamKills ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0;
  const minutes = match.duration / 60;
  const qk = queueKey(match.queueId) ?? (arena ? "queue_arena" : null);
  const multi = me.multiKill >= 2 ? (`multikill_${Math.min(me.multiKill, 5)}` as DictKey) : null;
  const champName = assets.names[me.champion] ?? me.champion;
  const tags = performanceTags(match, me).slice(0, 6);

  return (
    <article className={`overflow-hidden rounded-xl border border-line/60 ${tone.bg}`}>
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${tone.bar}`} />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={`font-display text-sm font-bold ${tone.text}`}>{label}</span>
            <span className="font-semibold text-text">{qk ? t(qk) : match.mode}</span>
            <span className="tabular text-faint">{duration(match.duration)}</span>
            <span className="text-faint" suppressHydrationWarning>
              {timeAgo(dict, match.endedAt)}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-7 gap-y-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative">
                <Icon src={img.champion(assets.version, me.champion)} size={56} className="rounded-lg" />
                <span className="tabular absolute -right-1 -bottom-1 rounded-md bg-ink px-1 text-[10px] text-muted">{me.championLevel}</span>
              </div>
              <Loadout p={me} a={assets} size={26} />
            </div>

            <Stat
              className="w-24"
              big={
                <>
                  {me.kills} <span className="text-faint">/</span> <span className="text-loss">{me.deaths}</span> <span className="text-faint">/</span>{" "}
                  {me.assists}
                </>
              }
              small={<span className={kdaColor(me.kills, me.deaths, me.assists)}>{kdaRatio(me.kills, me.deaths, me.assists)} KDA</span>}
            />
            {arena ? (
              <Stat className="w-20" big={compact(me.damage)} small={t("damage")} />
            ) : (
              <Stat className="w-20" big={`${me.cs} CS`} small={`${(me.cs / minutes).toFixed(1)} ${t("cs")}${t("per_min")}`} />
            )}
            <Stat className="w-20" big={`${kp}%`} small={t("kill_participation_short")} />

            <div className="flex shrink-0 items-center gap-1">
              <div className="grid grid-cols-3 gap-0.5">
                {me.items.slice(0, 6).map((id, i) => (
                  <Icon key={i} src={id ? img.item(assets.version, id) : null} size={28} />
                ))}
              </div>
              <Icon src={me.items[6] ? img.item(assets.version, me.items[6]) : null} size={28} className="rounded-full" />
            </div>

            {multi && <span className="rounded-full bg-loss/20 px-2.5 py-0.5 text-[11px] font-semibold text-loss">{t(multi)}</span>}
          </div>

          {tags.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag.key}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    tag.tone === "good" ? "border-buff/40 bg-buff/10 text-buff" : "border-nerf/40 bg-nerf/10 text-nerf"
                  }`}
                >
                  {t(tag.key, { c: champName })}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden w-[23rem] shrink-0 self-center border-l border-line/40 px-3 py-2 md:block">
          {arena ? (
            <Pairs match={match} puuid={puuid} server={server} version={assets.version} />
          ) : (
            <Lanes match={match} puuid={puuid} server={server} version={assets.version} />
          )}
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
