import "server-only";
import { mongoCollection } from "@/lib/cache";
import type { SeasonRank, TierStep } from "./types";

// Riot's API only knows the current rank, so the site keeps its own record:
// every time a rank is seen it updates that season's peak and latest value.

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];

function strength(s: TierStep): number {
  return TIERS.indexOf(s.tier) * 10_000 + Math.max(0, DIVISIONS.indexOf(s.rank)) * 1_000 + s.leaguePoints;
}

export function currentSeason(now = new Date()): string {
  return `S${now.getUTCFullYear()}`;
}

const memory = new Map<string, SeasonRank & { puuid: string }>();

export async function recordRanks(
  puuid: string,
  server: string,
  entries: (TierStep & { queueType: string })[],
): Promise<void> {
  const season = currentSeason();
  const coll = await mongoCollection("rank_history");

  for (const e of entries) {
    if (!TIERS.includes(e.tier)) continue;
    const id = `${puuid}:${season}:${e.queueType}`;
    const seen: TierStep = { tier: e.tier, rank: e.rank, leaguePoints: e.leaguePoints };
    const prev = memory.get(id) ?? ((await coll?.findOne({ _id: id as never }).catch(() => null)) as SeasonRank | null);
    const peak = prev && strength(prev.peak) >= strength(seen) ? prev.peak : seen;
    const row = { puuid, server, season, queueType: e.queueType, peak, last: seen, updatedAt: Date.now() };
    memory.set(id, row);
    await coll?.updateOne({ _id: id as never }, { $set: row }, { upsert: true }).catch(() => {});
  }
}

export async function getRankHistory(puuid: string): Promise<SeasonRank[]> {
  const coll = await mongoCollection("rank_history");
  const rows = coll
    ? ((await coll.find({ puuid }).toArray().catch(() => [])) as unknown as SeasonRank[])
    : [...memory.values()].filter((r) => r.puuid === puuid);

  return rows
    .map(({ season, queueType, peak, last, updatedAt }) => ({ season, queueType, peak, last, updatedAt }))
    .sort((a, b) => b.season.localeCompare(a.season) || a.queueType.localeCompare(b.queueType));
}
