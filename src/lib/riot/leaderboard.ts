import "server-only";
import { MemoryCache, cached } from "@/lib/cache";
import { riot } from "./client";
import { getServer } from "./servers";
import type { LeaderboardEntry } from "./types";

const boardCache = new MemoryCache<LeaderboardEntry[]>(15 * 60_000, 50);
const nameCache = new MemoryCache<{ name: string; tag: string; icon: number }>(24 * 60 * 60_000, 5000);

const RESOLVE = 25;

export async function getLeaderboard(serverId: string, queue: string): Promise<LeaderboardEntry[]> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);

  return cached(boardCache, `${server.id}:${queue}`, async () => {
    const league = await riot<{
      entries: { puuid: string; leaguePoints: number; wins: number; losses: number; hotStreak: boolean }[];
    }>(server.platform, `/lol/league/v4/challengerleagues/by-queue/${queue}`);

    const top = [...league.entries].sort((a, b) => b.leaguePoints - a.leaguePoints).slice(0, 100);

    // Riot ID and icon cost two requests per player, so only the top rows get them.
    const resolved = await Promise.all(
      top.slice(0, RESOLVE).map((e) =>
        cached(nameCache, e.puuid, async () => {
          const puuid = encodeURIComponent(e.puuid);
          const [acc, summ] = await Promise.all([
            riot<{ gameName: string; tagLine: string }>(
              server.region === "sea" ? "asia" : server.region,
              `/riot/account/v1/accounts/by-puuid/${puuid}`,
            ),
            riot<{ profileIconId: number }>(server.platform, `/lol/summoner/v4/summoners/by-puuid/${puuid}`),
          ]);
          return { name: acc.gameName, tag: acc.tagLine, icon: summ.profileIconId };
        }).catch(() => null),
      ),
    );

    return top.map((e, i) => {
      const who = resolved[i] ?? nameCache.get(e.puuid) ?? null;
      return {
        rank: i + 1,
        puuid: e.puuid,
        name: who?.name ?? null,
        tag: who?.tag ?? null,
        profileIconId: who?.icon ?? null,
        leaguePoints: e.leaguePoints,
        wins: e.wins,
        losses: e.losses,
        hotStreak: e.hotStreak,
      };
    });
  });
}
