import "server-only";
import { MemoryCache, cached, mongoCollection } from "@/lib/cache";
import { riot } from "./client";
import { recordRanks } from "./history";
import { getServer, type Server } from "./servers";
import type { LeaderboardEntry } from "./types";

export const PAGE_SIZE = 50;
export const MAX_RANK = 1000;

interface LadderRow {
  puuid: string;
  tier: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

interface Who {
  name: string;
  tag: string;
  icon: number | null;
  /** Champion keys with the most mastery points, best first. */
  top?: number[];
}

const ladderCache = new MemoryCache<LadderRow[] & { complete?: boolean }>(15 * 60_000, 50);

// Riot returns at most this many entries per league, so a full Master list means it was cut off.
const LEAGUE_CAP = 10_000;
const whoCache = new MemoryCache<Who>(7 * 24 * 60 * 60_000, 20_000);
const iconQueue = new Set<string>();
const nameQueue = new Set<string>();

const accountHost = (s: Server) => (s.region === "sea" ? "asia" : s.region);

/** Challenger, then Grandmaster, then Master, merged by LP. The full list is kept for ladder ranks. */
async function ladder(server: Server, queue: string): Promise<LadderRow[] & { complete?: boolean }> {
  return cached(ladderCache, `${server.id}:${queue}`, async () => {
    const tiers = ["challenger", "grandmaster", "master"] as const;
    const leagues = await Promise.all(
      tiers.map((t) =>
        riot<{ tier: string; entries: Omit<LadderRow, "tier">[] }>(
          server.platform,
          `/lol/league/v4/${t}leagues/by-queue/${queue}`,
        ).catch(() => ({ tier: t.toUpperCase(), entries: [] })),
      ),
    );
    const rows = leagues.flatMap((l, i) =>
      l.entries.map((e) => ({
        puuid: e.puuid,
        tier: tiers[i].toUpperCase(),
        leaguePoints: e.leaguePoints,
        wins: e.wins,
        losses: e.losses,
        hotStreak: e.hotStreak,
      })),
    );
    if (rows.length === 0) throw new Error("empty ladder");
    const sorted: LadderRow[] & { complete?: boolean } = rows.sort((a, b) => b.leaguePoints - a.leaguePoints);
    sorted.complete = leagues.every((l) => l.entries.length < LEAGUE_CAP);
    return sorted;
  });
}

async function storedWho(puuids: string[]): Promise<Map<string, Who>> {
  const found = new Map<string, Who>();
  const missing: string[] = [];
  for (const p of puuids) {
    const hit = whoCache.get(p);
    if (hit) found.set(p, hit);
    else missing.push(p);
  }
  const coll = await mongoCollection("puuid_names");
  if (coll && missing.length) {
    const docs = await coll.find({ _id: { $in: missing } as never }).toArray().catch(() => []);
    for (const d of docs) {
      const who = { name: d.name as string, tag: d.tag as string, icon: (d.icon as number) ?? null, top: d.top as number[] | undefined };
      whoCache.set(d._id as unknown as string, who);
      found.set(d._id as unknown as string, who);
    }
  }
  return found;
}

async function saveWho(puuid: string, who: Who) {
  whoCache.set(puuid, who);
  const coll = await mongoCollection("puuid_names");
  await coll?.updateOne({ _id: puuid as never }, { $set: { ...who, at: new Date() } }, { upsert: true }).catch(() => {});
}

/** Icon and top champions cost two more requests per player, so they are filled in behind the page at low priority. */
function queueIcons(server: Server, puuids: string[]) {
  for (const puuid of puuids) {
    if (iconQueue.has(puuid)) continue;
    iconQueue.add(puuid);
    const id = encodeURIComponent(puuid);
    void Promise.all([
      riot<{ profileIconId: number }>(server.platform, `/lol/summoner/v4/summoners/by-puuid/${id}`, "low").catch(() => null),
      riot<{ championId: number }[]>(server.platform, `/lol/champion-mastery/v4/champion-masteries/by-puuid/${id}/top?count=5`, "low").catch(
        () => null,
      ),
    ])
      .then(async ([summoner, mastery]) => {
        const who = whoCache.get(puuid);
        if (!who) return;
        await saveWho(puuid, {
          ...who,
          icon: summoner?.profileIconId ?? who.icon,
          top: mastery ? mastery.map((m) => m.championId) : who.top,
        });
      })
      .finally(() => iconQueue.delete(puuid));
  }
}

/** Names that failed during a page load (usually the rate limit) are retried behind it. */
function queueNames(server: Server, puuids: string[]) {
  for (const puuid of puuids) {
    if (nameQueue.has(puuid)) continue;
    nameQueue.add(puuid);
    void riot<{ gameName: string; tagLine: string }>(
      accountHost(server),
      `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
      "low",
    )
      .then(async (acc) => {
        await saveWho(puuid, { name: acc.gameName, tag: acc.tagLine, icon: null });
        queueIcons(server, [puuid]);
      })
      .catch(() => {})
      .finally(() => nameQueue.delete(puuid));
  }
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  page: number;
  pages: number;
}

export async function getLeaderboardPage(serverId: string, queue: string, page: number): Promise<LeaderboardPage> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);

  const rows = (await ladder(server, queue)).slice(0, MAX_RANK);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);

  const known = await storedWho(slice.map((r) => r.puuid));
  await Promise.all(
    slice
      .filter((r) => !known.has(r.puuid))
      .map(async (r) => {
        try {
          const acc = await riot<{ gameName: string; tagLine: string }>(
            accountHost(server),
            `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(r.puuid)}`,
          );
          const who = { name: acc.gameName, tag: acc.tagLine, icon: null };
          known.set(r.puuid, who);
          await saveWho(r.puuid, who);
        } catch {
          queueNames(server, [r.puuid]);
        }
      }),
  );
  queueIcons(
    server,
    slice
      .filter((r) => {
        const who = known.get(r.puuid);
        return who && (who.icon === null || !who.top);
      })
      .map((r) => r.puuid),
  );

  for (const r of slice) {
    void recordRanks(r.puuid, server.id, [{ queueType: queue, tier: r.tier, rank: "I", leaguePoints: r.leaguePoints }]);
  }

  return {
    page: current,
    pages,
    entries: slice.map((r, i) => {
      const who = known.get(r.puuid);
      return {
        rank: start + i + 1,
        puuid: r.puuid,
        tier: r.tier,
        name: who?.name ?? null,
        tag: who?.tag ?? null,
        profileIconId: who?.icon ?? null,
        topChampions: who?.top ?? null,
        leaguePoints: r.leaguePoints,
        wins: r.wins,
        losses: r.losses,
        hotStreak: r.hotStreak,
      };
    }),
  };
}

/** Position on the server's Master+ ladder, or null when not in the list Riot returns. `of` is null if that list was cut off. */
export async function getLadderRank(serverId: string, queue: string, puuid: string): Promise<{ rank: number; of: number | null } | null> {
  const server = getServer(serverId);
  if (!server) return null;
  const rows = await ladder(server, queue).catch(() => null);
  if (!rows) return null;
  const i = rows.findIndex((r) => r.puuid === puuid);
  return i < 0 ? null : { rank: i + 1, of: rows.complete ? rows.length : null };
}
