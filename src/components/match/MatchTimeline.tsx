"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";
import { compact } from "@/lib/format";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Timeline, TimelineObjective } from "@/lib/riot/timeline";
import type { MatchPlayer } from "@/lib/riot/types";
import type { Assets } from "../profile/MatchCard";

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

function Img({ src, size, className = "" }: { src: string | null; size: number; className?: string }) {
  if (!src) return <span className={`inline-block shrink-0 rounded bg-ink ${className}`} style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded ${className}`} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line/70 bg-panel">
      <h2 className="border-b border-line/70 px-4 py-2.5 font-display text-sm font-semibold">{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Blue team's gold lead each minute; above the line is blue ahead, below is red. */
function GoldGraph({ timeline }: { timeline: Timeline }) {
  const { t } = useI18n();
  const diffs = timeline.gold.map((g) => g.blue - g.red);
  const W = 1000;
  const H = 240;
  const pad = 30;
  const max = Math.max(1000, ...diffs.map(Math.abs));
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, diffs.length - 1);
  const y = (d: number) => H / 2 - (d / max) * (H / 2 - pad);
  const line = diffs.map((d, i) => `${x(i)},${y(d)}`).join(" ");
  const area = `${x(0)},${H / 2} ${line} ${x(diffs.length - 1)},${H / 2}`;

  return (
    <Panel title={t("gold_lead")}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("gold_lead")}>
        <defs>
          <clipPath id="above">
            <rect x="0" y="0" width={W} height={H / 2} />
          </clipPath>
          <clipPath id="below">
            <rect x="0" y={H / 2} width={W} height={H / 2} />
          </clipPath>
        </defs>
        <polygon points={area} fill="var(--color-win)" opacity="0.25" clipPath="url(#above)" />
        <polygon points={area} fill="var(--color-loss)" opacity="0.25" clipPath="url(#below)" />
        <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} stroke="var(--color-line)" />
        <polyline points={line} fill="none" stroke="var(--color-text)" strokeWidth="2" />
        <text x={pad} y={pad - 10} fontSize="12" fill="var(--color-win)">
          +{compact(max)} {t("blue_team")}
        </text>
        <text x={pad} y={H - 8} fontSize="12" fill="var(--color-loss)">
          +{compact(max)} {t("red_team")}
        </text>
        {diffs.map((d, i) =>
          i % 5 === 0 ? (
            <text key={i} x={x(i)} y={H / 2 + 14} fontSize="11" textAnchor="middle" fill="var(--color-faint)">
              {i}:00
            </text>
          ) : null,
        )}
      </svg>
    </Panel>
  );
}

const OBJECTIVE_KEY: Record<TimelineObjective["type"], DictKey> = {
  DRAGON: "obj_dragon",
  BARON_NASHOR: "obj_baron",
  RIFTHERALD: "obj_herald",
  HORDE: "obj_grubs",
  ATAKHAN: "obj_atakhan",
  TOWER: "obj_tower",
  INHIBITOR: "obj_inhibitor",
};

function Objectives({ timeline }: { timeline: Timeline }) {
  const { t } = useI18n();
  const list = [...timeline.objectives].sort((a, b) => a.t - b.t);
  return (
    <Panel title={t("objectives")}>
      <ol className="relative space-y-1.5 border-l border-line pl-4 text-xs">
        {list.map((o, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={`h-2 w-2 -translate-x-[21px] rounded-full ${o.teamId === 100 ? "bg-win" : "bg-loss"}`} />
            <span className="tabular -ml-2 w-10 text-faint">{mmss(o.t)}</span>
            <span className={o.teamId === 100 ? "text-win" : "text-loss"}>{o.teamId === 100 ? t("blue_team") : t("red_team")}</span>
            <span className="text-text">
              {t(OBJECTIVE_KEY[o.type])}
              {o.sub && o.type === "DRAGON" && <span className="text-muted"> ({o.sub.replace("_DRAGON", "").toLowerCase()})</span>}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Build({ timeline, players, assets, initial }: { timeline: Timeline; players: MatchPlayer[]; assets: Assets; initial: string }) {
  const { t } = useI18n();
  const [who, setWho] = useState(initial || players[0]?.puuid);
  const items = timeline.items[who] ?? [];
  const skills = timeline.skills[who] ?? [];

  // Purchases in the same minute go together, like a shop visit.
  const visits: { t: number; ids: number[] }[] = [];
  for (const it of items) {
    const last = visits.at(-1);
    if (last && Math.floor(last.t / 60) === Math.floor(it.t / 60)) last.ids.push(it.id);
    else visits.push({ t: it.t, ids: [it.id] });
  }

  return (
    <Panel title={t("build_order")}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {players.map((p) => (
          <button
            key={p.puuid}
            type="button"
            onClick={() => setWho(p.puuid)}
            title={`${p.name}#${p.tag}`}
            className={`rounded-lg p-0.5 ${who === p.puuid ? "ring-2 ring-gold" : "opacity-60 hover:opacity-100"} ${
              p.teamId === 100 ? "bg-win/20" : "bg-loss/20"
            }`}
          >
            <Img src={img.champion(assets.version, p.champion)} size={34} className="rounded-md" />
          </button>
        ))}
      </div>

      <h3 className="mb-2 text-xs font-semibold tracking-wider text-faint uppercase">{t("items")}</h3>
      <div className="flex flex-wrap items-start gap-x-1 gap-y-3">
        {visits.map((v, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="text-center">
              <div className="flex gap-0.5 rounded-md bg-ink/60 p-1">
                {v.ids.map((id, j) => (
                  <Img key={j} src={img.item(assets.version, id)} size={28} />
                ))}
              </div>
              <p className="tabular mt-0.5 text-[10px] text-faint">{mmss(v.t)}</p>
            </div>
            {i < visits.length - 1 && <span className="mt-3 text-faint">›</span>}
          </div>
        ))}
        {visits.length === 0 && <p className="text-xs text-muted">—</p>}
      </div>

      <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-faint uppercase">{t("skill_order")}</h3>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <tbody>
            {["Q", "W", "E", "R"].map((key, row) => (
              <tr key={key}>
                <td className="pr-2 font-display font-bold text-muted">{key}</td>
                {Array.from({ length: 18 }, (_, lvl) => (
                  <td key={lvl} className="p-0.5">
                    <span
                      className={`tabular flex h-6 w-6 items-center justify-center rounded text-[11px] ${
                        skills[lvl] === row + 1 ? (row === 3 ? "bg-gold text-ink" : "bg-win/70 text-text") : "bg-ink/60 text-transparent"
                      }`}
                    >
                      {lvl + 1}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Fetches the timeline after the page is up; retries while Riot's rate limit is in the way. */
export function MatchTimeline({ matchId, players, assets, focus }: { matchId: string; players: MatchPlayer[]; assets: Assets; focus: string }) {
  const { t } = useI18n();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load(attempt: number) {
      try {
        const res = await fetch(`/api/timeline?id=${encodeURIComponent(matchId)}`);
        if (stop) return;
        if (res.ok) return setTimeline(await res.json());
        if ((res.status === 429 || res.status >= 500) && attempt < 6) {
          timer = setTimeout(() => load(attempt + 1), 15_000);
          return;
        }
      } catch {}
      if (!stop) setFailed(true);
    }
    void load(0);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [matchId]);

  if (!timeline)
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-line/70 bg-panel p-8 text-sm text-muted">
        {failed ? t("timeline_unavailable") : <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
    );

  return (
    <div className="space-y-4">
      <GoldGraph timeline={timeline} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Build timeline={timeline} players={players} assets={assets} initial={focus} />
        <Objectives timeline={timeline} />
      </div>
    </div>
  );
}
