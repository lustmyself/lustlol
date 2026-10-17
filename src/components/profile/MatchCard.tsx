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
import type { MatchPlayer, MatchSummary, MatchTeam } from "@/lib/riot/types";

export interface Assets {
  version: string;
  spells: Record<number, string>;
  runes: Record<number, string>;
  /** Data Dragon id -> display name, e.g. "MonkeyKing" -> "Wukong" */
  names: Record<string, string>;
  /** Numeric champion key (as in bans) -> Data Dragon id */
  byKey: Record<number, string>;
}

function Icon({ src, size, className = "" }: { src: string | null; size: number; className?: string }) {
  if (!src) return <span className={`inline-block shrink-0 rounded bg-ink ${className}`} style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded ${className}`} />;
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

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const roleIcon = (role: string) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${role.toLowerCase()}.png`;

function byRole(team: MatchPlayer[]): MatchPlayer[] {
  if (!team.every((p) => ROLES.includes(p.position))) return team;
  return [...team].sort((a, b) => ROLES.indexOf(a.position) - ROLES.indexOf(b.position));
}

function Stat({
  big,
  small,
  className = "",
  children,
}: {
  big: React.ReactNode;
  small: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`shrink-0 text-center ${className}`}>
      <p className="tabular font-display text-base font-bold whitespace-nowrap">{big}</p>
      <p className="tabular text-[11px] whitespace-nowrap text-muted">{small}</p>
      {children}
    </div>
  );
}

function LpChip({ lp }: { lp: number | null }) {
  const { t } = useI18n();
  const tone = lp === null ? "bg-ink/60 text-faint" : lp > 0 ? "bg-buff/15 text-buff" : lp < 0 ? "bg-nerf/15 text-nerf" : "bg-ink/60 text-muted";
  return (
    <span className="group relative ml-2">
      <span tabIndex={0} className={`tabular inline-block cursor-help rounded-md px-2 py-1 text-xs font-bold whitespace-nowrap outline-none ${tone}`}>
        {lp === null ? "? LP" : `${lp > 0 ? "+" : ""}${lp} LP`}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-line bg-panel-2 p-2.5 text-xs leading-relaxed text-muted opacity-0 shadow-2xl shadow-black/60 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {lp === null ? t("lp_unknown") : t("lp_known")}
      </span>
    </span>
  );
}

const TEAM_STYLE = {
  great: "bg-teal/15 text-teal",
  good: "bg-win/20 text-win",
  bad: "bg-adjust/15 text-adjust",
} as const;

/** How the player's teammates (not the player) did, by their combined KDA. */
function TeamLabel({ match, me }: { match: MatchSummary; me: MatchPlayer }) {
  const { t } = useI18n();
  if (match.mode === "CHERRY" || match.remake) return null;
  const mates = match.players.filter((p) => p.teamId === me.teamId && p.puuid !== me.puuid);
  if (mates.length === 0) return null;
  const k = mates.reduce((s, p) => s + p.kills, 0);
  const d = mates.reduce((s, p) => s + p.deaths, 0);
  const a = mates.reduce((s, p) => s + p.assists, 0);
  const kda = (k + a) / Math.max(1, d);
  const level = kda >= 3 ? "great" : kda >= 1.8 ? "good" : "bad";
  return (
    <span className="group relative mt-1 inline-block">
      <span tabIndex={0} className={`inline-block cursor-help rounded px-2 py-0.5 text-[10px] font-semibold outline-none ${TEAM_STYLE[level]}`}>
        {t(`team_${level}`)}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-line bg-panel-2 p-2.5 text-left text-xs leading-relaxed text-muted opacity-0 shadow-2xl shadow-black/60 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {t("team_why", { k, d, a, kda: kda.toFixed(2) })}
      </span>
    </span>
  );
}

function TeamName({ p, server, me, align }: { p: MatchPlayer; server: string; me: boolean; align: "left" | "right" }) {
  const side = align === "right" ? "text-right" : "";
  if (me) return <span className={`truncate font-semibold text-gold ${side}`}>{p.name}</span>;
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

export function MatchCard({
  match,
  puuid,
  server,
  assets,
  lp,
}: {
  match: MatchSummary;
  puuid: string;
  server: string;
  assets: Assets;
  /** LP from this game: a number, null when it can't be told, undefined when it doesn't apply. */
  lp?: number | null;
}) {
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

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pr-2">
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="relative">
                <Icon src={img.champion(assets.version, me.champion)} size={56} className="rounded-lg" />
                <span className="tabular absolute -right-1 -bottom-1 rounded-md bg-ink px-1 text-[10px] text-muted">{me.championLevel}</span>
              </div>
              <Loadout p={me} a={assets} size={26} />
              {lp !== undefined && <LpChip lp={lp} />}
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
            >
              <TeamLabel match={match} me={me} />
            </Stat>
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
                <li key={tag.key} className="group relative">
                  <span
                    tabIndex={0}
                    className={`inline-block cursor-help rounded-md border px-2 py-0.5 text-[11px] font-medium outline-none ${
                      tag.tone === "good" ? "border-buff/40 bg-buff/10 text-buff" : "border-nerf/40 bg-nerf/10 text-nerf"
                    }`}
                  >
                    {t(tag.key, { c: champName })}
                  </span>
                  <div
                    role="tooltip"
                    className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-72 rounded-lg border border-line bg-panel-2 p-3 opacity-0 shadow-2xl shadow-black/60 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                  >
                    <p className={`font-display text-sm font-semibold ${tag.tone === "good" ? "text-buff" : "text-nerf"}`}>
                      {t(tag.key, { c: champName })}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(tag.why, tag.vars)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden w-[24rem] shrink-0 self-center border-l border-line/40 px-3 py-2 md:block">
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

function teamTotals(players: MatchPlayer[]) {
  return players.reduce((t, p) => ({ k: t.k + p.kills, d: t.d + p.deaths, a: t.a + p.assists }), { k: 0, d: 0, a: 0 });
}

function Objectives({ team, align }: { team?: MatchTeam; align: "left" | "right" }) {
  const { t } = useI18n();
  if (!team) return <span />;
  const items: [string, number | undefined][] = [
    [t("towers"), team.towers],
    [t("dragons"), team.dragons],
    [t("barons"), team.barons],
    [t("heralds"), team.heralds],
    [t("grubs"), team.grubs],
  ];
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted ${align === "right" ? "justify-end" : ""}`}>
      {items
        .filter(([, n]) => n !== undefined)
        .map(([label, n]) => (
          <span key={label}>
            <span className="tabular font-semibold text-text">{n}</span> {label}
          </span>
        ))}
    </div>
  );
}

/** One player, laid out toward the middle: `side` is the team's edge of the card. */
function DetailRow({
  p,
  side,
  match,
  puuid,
  server,
  assets,
  maxDamage,
  teamKills,
}: {
  p: MatchPlayer;
  side: "left" | "right";
  match: MatchSummary;
  puuid: string;
  server: string;
  assets: Assets;
  maxDamage: number;
  teamKills: number;
}) {
  const { t } = useI18n();
  const minutes = match.duration / 60;
  const mine = p.puuid === puuid;
  const kp = teamKills ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
  const right = side === "right";
  const bar = p.teamId === 100 ? "bg-win" : "bg-loss";

  const who = (
    <div className={`flex min-w-0 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative shrink-0">
        <Icon src={img.champion(assets.version, p.champion)} size={36} className={`rounded-lg ${mine ? "ring-2 ring-gold" : ""}`} />
        <span className="tabular absolute -bottom-1 rounded bg-ink px-1 text-[9px] text-muted" style={right ? { left: -4 } : { right: -4 }}>
          {p.championLevel}
        </span>
      </div>
      <Loadout p={p} a={assets} size={16} />
      <div className="min-w-0">
        {p.name === "?" ? (
          <span className="text-faint">?</span>
        ) : (
          <Link
            href={`/summoner/${server}/${riotIdToSlug(p.name, p.tag)}`}
            className={`block truncate text-xs hover:underline ${mine ? "font-semibold text-gold" : "font-medium text-text"}`}
            title={`${p.name}#${p.tag}`}
          >
            {p.name}
          </Link>
        )}
        {p.name !== "?" && <p className="truncate text-[10px] text-faint">#{p.tag}</p>}
      </div>
    </div>
  );

  const stats = (
    <div className={`text-[11px] leading-4 ${right ? "text-right" : ""}`}>
      <p className="tabular text-sm font-bold">
        {p.kills} <span className="text-faint">/</span> <span className="text-loss">{p.deaths}</span> <span className="text-faint">/</span>{" "}
        {p.assists}
        <span className={`ml-1.5 text-[11px] font-semibold ${kdaColor(p.kills, p.deaths, p.assists)}`}>{kdaRatio(p.kills, p.deaths, p.assists)}</span>
      </p>
      <p className="tabular text-muted">
        {p.cs} CS ({(p.cs / minutes).toFixed(1)}) · {compact(p.gold)} {t("gold").toLowerCase()}
      </p>
      <p className="tabular text-muted">
        {kp}% {t("kill_participation_short")} · {t("vision")} {p.vision}
      </p>
    </div>
  );

  const damage = (
    <div className="w-16 shrink-0" title={t("damage")}>
      <p className={`tabular text-[11px] text-muted ${right ? "text-right" : ""}`}>{compact(p.damage)}</p>
      <div className={`mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-ink ${right ? "justify-end" : ""}`}>
        <div className={`h-full ${bar}`} style={{ width: `${(p.damage / maxDamage) * 100}%` }} />
      </div>
    </div>
  );

  const items = (
    <div className={`flex shrink-0 items-center gap-0.5 ${right ? "flex-row-reverse" : ""}`}>
      <div className="grid grid-cols-3 gap-0.5">
        {p.items.slice(0, 6).map((id, i) => (
          <Icon key={i} src={id ? img.item(assets.version, id) : null} size={20} />
        ))}
      </div>
      <Icon src={p.items[6] ? img.item(assets.version, p.items[6]) : null} size={20} className="rounded-full" />
    </div>
  );

  return (
    <div
      className={`grid items-center gap-2 rounded-lg px-1.5 py-1.5 ${mine ? "bg-gold/5" : ""} ${
        right ? "grid-cols-[auto_auto_auto_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_auto_auto_auto]"
      }`}
    >
      {right ? (
        <>
          {items}
          {damage}
          {stats}
          {who}
        </>
      ) : (
        <>
          {who}
          {stats}
          {damage}
          {items}
        </>
      )}
    </div>
  );
}

function MatchDetails({ match, puuid, server, assets }: { match: MatchSummary; puuid: string; server: string; assets: Assets }) {
  const { t } = useI18n();
  const blue = byRole(match.players.filter((p) => p.teamId === 100));
  const red = byRole(match.players.filter((p) => p.teamId === 200));
  const maxDamage = Math.max(...match.players.map((p) => p.damage), 1);
  const teams = { 100: match.teams.find((x) => x.teamId === 100), 200: match.teams.find((x) => x.teamId === 200) };
  const totals = { 100: teamTotals(blue), 200: teamTotals(red) };
  const qk = queueKey(match.queueId);

  // Arena lobbies are too large to face off; list them as before.
  if (match.mode === "CHERRY" || red.length === 0) {
    return (
      <div className="space-y-1 border-t border-line/60 bg-ink/40 p-3">
        {match.players.map((p) => (
          <DetailRow
            key={p.puuid}
            p={p}
            side="left"
            match={match}
            puuid={puuid}
            server={server}
            assets={assets}
            maxDamage={maxDamage}
            teamKills={match.players.filter((x) => x.subteam === p.subteam).reduce((s, x) => s + x.kills, 0)}
          />
        ))}
      </div>
    );
  }

  const result = (team?: MatchTeam) =>
    team?.win ? <span className="font-display font-bold text-win">{t("victory")}</span> : <span className="font-display font-bold text-loss">{t("defeat")}</span>;
  const kda = (x: { k: number; d: number; a: number }) => (
    <span className="tabular text-muted">
      {x.k} / {x.d} / {x.a}
    </span>
  );
  const bans = (team?: MatchTeam, align: "left" | "right" = "left") =>
    team?.bans && team.bans.length > 0 ? (
      <div className={`flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="text-[11px] text-faint">{t("bans")}</span>
        {team.bans.map((key, i) => {
          const id = assets.byKey[key];
          return <Icon key={i} src={id ? img.champion(assets.version, id) : null} size={22} className="rounded-full opacity-70 grayscale" />;
        })}
      </div>
    ) : (
      <span />
    );

  return (
    <div className="border-t border-line/60 bg-ink/40 p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 pb-2 text-sm">
        <div className="flex items-center gap-3">
          {result(teams[100])}
          {kda(totals[100])}
          <span className="text-[11px] font-semibold tracking-wider text-win uppercase">{t("blue_team")}</span>
        </div>
        <div className="text-center text-xs text-muted">
          {qk ? t(qk) : match.mode} ({duration(match.duration)})
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="text-[11px] font-semibold tracking-wider text-loss uppercase">{t("red_team")}</span>
          {kda(totals[200])}
          {result(teams[200])}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-y border-line/40 px-2 py-1.5">
        <Objectives team={teams[100]} align="left" />
        <Objectives team={teams[200]} align="right" />
      </div>

      <div className="mt-1 space-y-0.5 overflow-x-auto">
        {blue.map((b, i) => {
          const r = red[i];
          return (
            <div key={b.puuid} className="grid min-w-[940px] grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-1">
              <DetailRow p={b} side="left" match={match} puuid={puuid} server={server} assets={assets} maxDamage={maxDamage} teamKills={totals[100].k} />
              {ROLES.includes(b.position) ? <Icon src={roleIcon(b.position)} size={16} className="opacity-50" /> : <span />}
              {r ? (
                <DetailRow p={r} side="right" match={match} puuid={puuid} server={server} assets={assets} maxDamage={maxDamage} teamKills={totals[200].k} />
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-ink/50 px-3 py-2">
        {bans(teams[100], "left")}
        {bans(teams[200], "right")}
      </div>
    </div>
  );
}
