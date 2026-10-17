import Link from "next/link";
import { Flame } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { img } from "@/lib/riot/images";
import { riotIdToSlug } from "@/lib/riot/servers";
import { TIER_COLORS, tierName, winrateColor } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/riot/types";

export function LeaderboardTable({
  entries,
  server,
  version,
  dict,
  byKey = {},
  compact = false,
}: {
  entries: LeaderboardEntry[];
  server: string;
  version: string;
  dict: Dictionary;
  /** Champion key -> Data Dragon id, for the most played column. */
  byKey?: Record<number, string>;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/70 bg-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line/70 text-left text-[11px] uppercase tracking-wider text-faint">
            <th className="w-12 py-2.5 pl-4">#</th>
            <th className="py-2.5">{dict.player}</th>
            {!compact && <th className="hidden py-2.5 md:table-cell">{dict.tier}</th>}
            <th className="py-2.5 text-right">{dict.lp}</th>
            {!compact && (
              <th className="hidden py-2.5 pl-8 lg:table-cell" title={dict.most_played_note}>
                {dict.most_played}
              </th>
            )}
            {!compact && <th className="hidden py-2.5 text-right sm:table-cell">{dict.games}</th>}
            <th className="py-2.5 pr-4 text-right">{dict.winrate}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const games = e.wins + e.losses;
            const wr = games ? Math.round((e.wins / games) * 100) : 0;
            return (
              <tr key={e.puuid} className="border-b border-line/40 last:border-0 hover:bg-white/[0.02]">
                <td className={`tabular py-2 pl-4 font-display font-bold ${e.rank <= 3 ? "text-gold" : "text-faint"}`}>{e.rank}</td>
                <td className="py-2">
                  {e.name ? (
                    <Link href={`/summoner/${server}/${riotIdToSlug(e.name, e.tag!)}`} className="flex items-center gap-2.5 hover:underline">
                      {e.profileIconId !== null ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.profileIcon(version, e.profileIconId)} alt="" className="h-7 w-7 rounded-md" loading="lazy" />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-md bg-ink" />
                      )}
                      <span className="truncate font-medium">
                        {e.name}
                        <span className="text-faint"> #{e.tag}</span>
                      </span>
                      {e.hotStreak && <Flame className="h-3.5 w-3.5 shrink-0 text-loss" aria-label={dict.hot_streak} />}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2.5 text-faint">
                      <span className="h-7 w-7 rounded-md bg-ink" />—
                    </span>
                  )}
                </td>
                {!compact && (
                  <td className="hidden py-2 text-xs font-semibold md:table-cell" style={{ color: TIER_COLORS[e.tier] }}>
                    {tierName(e.tier)}
                  </td>
                )}
                <td className="tabular py-2 text-right font-semibold text-gold">{e.leaguePoints.toLocaleString()}</td>
                {!compact && (
                  <td className="hidden py-2 pl-8 lg:table-cell">
                    {e.topChampions ? (
                      <div className="flex gap-1">
                        {e.topChampions.map((key) =>
                          byKey[key] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={key}
                              src={img.champion(version, byKey[key])}
                              alt={byKey[key]}
                              title={byKey[key]}
                              className="h-6 w-6 rounded-md"
                              loading="lazy"
                            />
                          ) : null,
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className="skeleton h-6 w-6 rounded-md" />
                        ))}
                      </div>
                    )}
                  </td>
                )}
                {!compact && <td className="tabular hidden py-2 text-right text-muted sm:table-cell">{games}</td>}
                <td className={`tabular py-2 pr-4 text-right font-semibold ${winrateColor(wr)}`}>{wr}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
