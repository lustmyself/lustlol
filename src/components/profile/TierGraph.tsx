"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { rankScore, shortRank } from "@/lib/format";
import type { RankPoint } from "@/lib/riot/history";

type Period = "daily" | "weekly" | "monthly";

const KEEP: Record<Period, number> = { daily: 14, weekly: 12, monthly: 12 };

function bucket(at: number, period: Period): string {
  const d = new Date(at);
  if (period === "monthly") return `${d.getFullYear()}-${d.getMonth()}`;
  if (period === "weekly") {
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return String(monday.getTime());
  }
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Last recorded point of each day, week or month. */
function series(points: RankPoint[], period: Period): RankPoint[] {
  const last = new Map<string, RankPoint>();
  for (const p of points) last.set(bucket(p.at, period), p);
  return [...last.values()].slice(-KEEP[period]);
}

const W = 1000;
const H = 220;
const PAD = { top: 44, right: 40, bottom: 34, left: 40 };

export function TierGraph({ points }: { points: RankPoint[] }) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<Period>("daily");
  const data = useMemo(() => series(points, period), [points, period]);

  const scores = data.map(rankScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 50);
  const x = (i: number) => (data.length === 1 ? W / 2 : PAD.left + (i * (W - PAD.left - PAD.right)) / (data.length - 1));
  const y = (s: number) => PAD.top + (1 - (s - min) / span) * (H - PAD.top - PAD.bottom);
  const date = (at: number) =>
    new Date(at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB", period === "monthly" ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" });

  return (
    <div className="mt-4 rounded-xl border border-line/70 bg-ink/40">
      <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5">
        <h3 className="font-display text-sm font-semibold">{t("tier_graph")}</h3>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 text-xs ${period === p ? "bg-panel-2 text-gold" : "text-muted hover:text-text"}`}
            >
              {t(`graph_${p}`)}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">{t("graph_empty")}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("tier_graph")}>
          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-line)" />
          <polyline
            fill="none"
            stroke="var(--color-loss)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={data.map((p, i) => `${x(i)},${y(scores[i])}`).join(" ")}
          />
          {data.map((p, i) => (
            <g key={p.at}>
              <circle cx={x(i)} cy={y(scores[i])} r="5" fill="var(--color-loss)" />
              <text x={x(i)} y={y(scores[i]) - 22} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-text)">
                {shortRank(p)}
              </text>
              <text x={x(i)} y={y(scores[i]) - 9} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
                {p.leaguePoints.toLocaleString()}LP
              </text>
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
                {date(p.at)}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
