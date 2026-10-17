import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { TIER_COLORS, rankLabel } from "@/lib/format";
import type { SeasonRank, TierStep } from "@/lib/riot/types";

const QUEUES: Record<string, keyof Dictionary> = {
  RANKED_SOLO_5x5: "ranked_solo",
  RANKED_FLEX_SR: "ranked_flex",
};

const label = (s: TierStep) => `${rankLabel(s.tier, s.rank)} ${s.leaguePoints} LP`;

/** Season badges with a hover card; sits under the emblem in the Solo/Duo card. */
export function SeasonBadges({ rows, current, dict }: { rows: SeasonRank[]; current: string; dict: Dictionary }) {
  const seasons = [...new Set(rows.map((r) => r.season))];
  if (seasons.length === 0) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-1.5" aria-label={dict.season_history}>
        {seasons.map((season) => {
          const queues = rows.filter((r) => r.season === season && QUEUES[r.queueType]);
          const solo = queues.find((r) => r.queueType === "RANKED_SOLO_5x5") ?? queues[0];
          if (!solo) return null;
          const live = season === current;
          const color = TIER_COLORS[solo.peak.tier];
          return (
            <li key={season} className="group relative">
              <span
                tabIndex={0}
                className="inline-block cursor-default rounded-md border px-2.5 py-1 font-display text-xs font-semibold outline-none"
                style={{ color, borderColor: `${color}66`, background: `${color}14` }}
              >
                {season} {rankLabel(solo.peak.tier, solo.peak.rank)}
              </span>
              <div className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 rounded-lg border border-line bg-panel-2 p-3 text-xs opacity-0 shadow-2xl shadow-black/60 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <p className="font-display text-sm font-semibold" style={{ color }}>
                  {season} {rankLabel(solo.peak.tier, solo.peak.rank)}
                </p>
                {queues.map((q) => (
                  <div key={q.queueType} className="mt-2">
                    <p className="font-semibold text-text">{dict[QUEUES[q.queueType]]}</p>
                    <p className="mt-0.5 leading-relaxed text-muted">
                      {format(live ? dict.season_peak_now : dict.season_peak, { r: label(q.peak) })}{" "}
                      {format(live ? dict.season_now : dict.season_end, { r: label(q.last) })}
                    </p>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
    </ul>
  );
}
