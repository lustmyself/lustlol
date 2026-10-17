import "server-only";
import { MemoryCache, cached } from "@/lib/cache";
import { RiotError, riot } from "./client";
import { gamesSince } from "./games";
import { getServer } from "./servers";

export interface LivePlayer {
  puuid: string;
  name: string;
  tag: string;
  teamId: number;
  championId: number;
  spells: [number, number];
  keystone: number;
  secondaryStyle: number;
}

export interface LiveGame {
  gameId: number;
  queueId: number;
  mode: string;
  /** Epoch ms; 0 while still in loading screen. */
  startedAt: number;
  players: LivePlayer[];
  bans: { teamId: number; championId: number }[];
}

interface RawLive {
  gameId: number;
  gameMode: string;
  gameQueueConfigId?: number;
  gameStartTime: number;
  bannedChampions?: { championId: number; teamId: number }[];
  participants: {
    puuid: string;
    riotId?: string;
    teamId: number;
    championId: number;
    spell1Id: number;
    spell2Id: number;
    perks?: { perkIds: number[]; perkStyle: number; perkSubStyle: number };
  }[];
}

// Short so a game that just started or ended shows up quickly.
const liveCache = new MemoryCache<LiveGame | null>(30_000, 2000);

/** The game the player is in right now, or null if they aren't in one. */
export async function getLiveGame(serverId: string, puuid: string): Promise<LiveGame | null> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);

  return cached(liveCache, `${server.id}:${puuid}`, async () => {
    let raw: RawLive;
    try {
      raw = await riot<RawLive>(server.platform, `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`);
    } catch (e) {
      if (e instanceof RiotError && e.code === "not_found") return null;
      throw e;
    }
    return {
      gameId: raw.gameId,
      queueId: raw.gameQueueConfigId ?? 0,
      mode: raw.gameMode,
      startedAt: raw.gameStartTime,
      bans: (raw.bannedChampions ?? []).filter((b) => b.championId > 0).map((b) => ({ teamId: b.teamId, championId: b.championId })),
      players: raw.participants.map((p) => {
        const [name, tag = ""] = (p.riotId ?? "?").split("#");
        // Streamer mode shows the champion's name with no tag.
        const hidden = !p.puuid || !tag;
        return {
          puuid: p.puuid ?? "",
          name: hidden ? "?" : name,
          tag: hidden ? "" : tag,
          teamId: p.teamId,
          championId: p.championId,
          spells: [p.spell1Id, p.spell2Id],
          keystone: p.perks?.perkIds?.[0] ?? 0,
          secondaryStyle: p.perks?.perkSubStyle ?? 0,
        };
      }),
    };
  });
}

export interface LiveDetails {
  puuid: string;
  solo: { tier: string; rank: string; leaguePoints: number; wins: number; losses: number } | null;
  mastery: { level: number; points: number } | null;
  /** Share of all the player's mastery points that are on this champion. */
  masteryShare: number;
  /** From games lustlol has stored, any queue. */
  onChampion: { games: number; wins: number; kills: number; deaths: number; assists: number };
  played12h: number;
  played30d: number;
}

const detailCache = new MemoryCache<LiveDetails>(5 * 60_000, 3000);

/** Rank, champion mastery and recent activity for one player in a live game (about four requests, cached). */
export async function getLiveDetails(serverId: string, puuid: string, championId: number, champion: string): Promise<LiveDetails> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);

  return cached(detailCache, `${server.id}:${puuid}:${championId}`, async () => {
    const id = encodeURIComponent(puuid);
    const now = Date.now();
    const ids = (ms: number) =>
      riot<string[]>(server.region, `/lol/match/v5/matches/by-puuid/${id}/ids?startTime=${Math.floor((now - ms) / 1000)}&count=100`).catch(
        () => [] as string[],
      );

    const [entries, masteries, h12, d30, stored] = await Promise.all([
      riot<{ queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }[]>(
        server.platform,
        `/lol/league/v4/entries/by-puuid/${id}`,
      ).catch(() => []),
      riot<{ championId: number; championLevel: number; championPoints: number }[]>(
        server.platform,
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${id}`,
      ).catch(() => []),
      ids(12 * 60 * 60_000),
      ids(30 * 24 * 60 * 60_000),
      filteredGames(puuid, champion),
    ]);

    const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
    const mine = masteries.find((m) => m.championId === championId);
    const total = masteries.reduce((s, m) => s + m.championPoints, 0);
    return {
      puuid,
      solo: solo ? { tier: solo.tier, rank: solo.rank, leaguePoints: solo.leaguePoints, wins: solo.wins, losses: solo.losses } : null,
      mastery: mine ? { level: mine.championLevel, points: mine.championPoints } : null,
      masteryShare: mine && total ? mine.championPoints / total : 0,
      onChampion: stored,
      played12h: h12.length,
      played30d: d30.length,
    };
  });
}

async function filteredGames(puuid: string, champion: string) {
  const games = (await gamesSince(puuid, 0)).filter((g) => g.champion === champion && !g.remake);
  return {
    games: games.length,
    wins: games.filter((g) => g.win).length,
    kills: games.reduce((s, g) => s + g.kills, 0),
    deaths: games.reduce((s, g) => s + g.deaths, 0),
    assists: games.reduce((s, g) => s + g.assists, 0),
  };
}
