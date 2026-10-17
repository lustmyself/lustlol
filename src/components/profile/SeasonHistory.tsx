import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { TIER_COLORS, rankEmblem, rankLabel } from "@/lib/format";
import type { SeasonRank } from "@/lib/riot/types";

function MiniEmblem({ tier }: { tier: string }) {
  // Same trick as the big emblem: the art is small in the middle of a wide canvas.
  return (
    <span className="relative inline-block h-7 w-8 shrink-0 overflow-hidden align-middle" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rankEmblem(tier)} alt="" className="absolute top-1/2 left-1/2 h-auto max-w-none -translate-x-1/2 -translate-y-1/2" style={{ width: 124 }} />
    </span>
  );
}

/**
 * This season's highest Solo/Duo rank and the final rank of past seasons,
 * from lustlol's own records (Riot only returns the current rank).
 */
export function SeasonTable({ rows, current, dict }: { rows: SeasonRank[]; current: string; dict: Dictionary }) {
  const solo = rows.filter((r) => r.queueType === "RANKED_SOLO_5x5");
  const now = solo.find((r) => r.season === current);
  const past = solo.filter((r) => r.season !== current).sort((a, b) => b.season.localeCompare(a.season));
  if (!now && past.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-line/60 pt-3">
      {now && (
        <div className="flex items-center gap-3 rounded-lg bg-ink/50 px-3 py-2">
          <MiniEmblem tier={now.peak.tier} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold" style={{ color: TIER_COLORS[now.peak.tier] }}>
              {rankLabel(now.peak.tier, now.peak.rank)}
            </p>
            <p className="tabular text-xs text-muted">{now.peak.leaguePoints} LP</p>
          </div>
          <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-[11px] font-semibold text-teal" title={dict.season_peak_note}>
            {dict.top_tier}
          </span>
        </div>
      )}

      {past.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
              <th className="pb-1 font-semibold">{dict.season}</th>
              <th className="pb-1 font-semibold">{dict.tier}</th>
              <th className="pb-1 text-right font-semibold">LP</th>
            </tr>
          </thead>
          <tbody>
            {past.map((r) => (
              <tr key={r.season} title={format(dict.season_peak, { r: `${rankLabel(r.peak.tier, r.peak.rank)} ${r.peak.leaguePoints} LP` })}>
                <td className="py-1">
                  <span className="rounded bg-ink px-1.5 py-0.5 font-display text-[10px] font-semibold text-muted">{r.season}</span>
                </td>
                <td className="py-1">
                  <span className="flex items-center gap-1.5">
                    <MiniEmblem tier={r.last.tier} />
                    <span style={{ color: TIER_COLORS[r.last.tier] }}>{rankLabel(r.last.tier, r.last.rank)}</span>
                  </span>
                </td>
                <td className="tabular py-1 text-right text-muted">{r.last.leaguePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[10px] text-faint">{dict.season_history_note}</p>
    </div>
  );
}
