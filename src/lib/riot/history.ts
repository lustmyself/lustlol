import "server-only";
import { mongoCollection } from "@/lib/cache";
import { rankScore } from "@/lib/format";
import type { SeasonRank, TierStep } from "./types";

// Riot's API only knows the current rank, so the site keeps its own record:
// every time a rank is seen it updates that season's peak and latest value.

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const strength = rankScore;

/** A rank seen at a moment, for the tier graph. */
export interface RankPoint extends TierStep {
  at: number;
}

const HOUR = 60 * 60_000;
const pointsInMemory = new Map<string, RankPoint & { puuid: string; queueType: string }>();

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
    await snapshot(puuid, e.queueType, seen);
  }
}

/** Keeps at most one point per player, queue and hour; the latest value in the hour wins. */
async function snapshot(puuid: string, queueType: string, seen: TierStep) {
  const hour = Math.floor(Date.now() / HOUR);
  const id = `${puuid}:${queueType}:${hour}`;
  const point = { puuid, queueType, ...seen, at: Date.now() };
  const coll = await mongoCollection("rank_points");
  if (!coll) {
    pointsInMemory.set(id, point);
    return;
  }
  await coll.updateOne({ _id: id as never }, { $set: point }, { upsert: true }).catch(() => {});
}

/** Every recorded point for a queue, oldest first. */
export async function getRankPoints(puuid: string, queueType: string): Promise<RankPoint[]> {
  const coll = await mongoCollection("rank_points");
  const rows = coll
    ? ((await coll.find({ puuid, queueType }, { projection: { _id: 0 } }).toArray().catch(() => [])) as unknown as RankPoint[])
    : [...pointsInMemory.values()].filter((p) => p.puuid === puuid && p.queueType === queueType);
  return rows
    .map(({ tier, rank, leaguePoints, at }) => ({ tier, rank, leaguePoints, at }))
    .sort((a, b) => a.at - b.at);
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
