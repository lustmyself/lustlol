import "server-only";
import { MemoryCache, cached, mongoCollection } from "@/lib/cache";
import { riot } from "./client";
import { recordRanks } from "./history";
import { getServer, type Server } from "./servers";
import type { MatchPage, MatchPlayer, MatchSummary, Profile, RankedEntry, SearchSuggestion } from "./types";

const MINUTE = 60_000;
const profileCache = new MemoryCache<Profile>(10 * MINUTE, 300);
const idCache = new MemoryCache<string[]>(3 * MINUTE, 500);
const matchCache = new MemoryCache<MatchSummary>(24 * 60 * MINUTE, 3000);

/** Everyone we've seen in a profile or a match, for search suggestions. */
export const knownPlayers = new MemoryCache<SearchSuggestion>(7 * 24 * 60 * MINUTE, 20_000);

function remember(p: SearchSuggestion) {
  const key = `${p.server}:${p.name.toLowerCase()}#${p.tag.toLowerCase()}`;
  const prev = knownPlayers.get(key);
  knownPlayers.set(key, { ...prev, ...p, tier: p.tier ?? prev?.tier, rank: p.rank ?? prev?.rank });
  void mongoCollection("players").then((c) =>
    c?.updateOne({ _id: key as never }, { $set: { ...p, seenAt: new Date() } }, { upsert: true }).catch(() => {}),
  );
}

interface RawAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export async function getAccount(server: Server, name: string, tag: string): Promise<RawAccount> {
  return riot<RawAccount>(
    server.region === "sea" ? "asia" : server.region,
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
  );
}

export async function getProfile(serverId: string, name: string, tag: string): Promise<Profile> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);
  const key = `${server.id}:${name.toLowerCase()}#${tag.toLowerCase()}`;

  return cached(profileCache, key, async () => {
    const account = await getAccount(server, name, tag);
    const puuid = encodeURIComponent(account.puuid);
    const [summoner, ranked] = await Promise.all([
      riot<{ summonerLevel: number; profileIconId: number }>(
        server.platform,
        `/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      ),
      riot<RankedEntry[]>(server.platform, `/lol/league/v4/entries/by-puuid/${puuid}`).catch(() => []),
    ]);

    await recordRanks(account.puuid, server.id, ranked).catch(() => {});

    const solo = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
    remember({
      name: account.gameName,
      tag: account.tagLine,
      server: server.id,
      profileIconId: summoner.profileIconId,
      level: summoner.summonerLevel,
      tier: solo?.tier,
      rank: solo?.rank,
    });

    return {
      puuid: account.puuid,
      name: account.gameName,
      tag: account.tagLine,
      server: server.id,
      level: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      ranked: ranked.map((r) => ({
        queueType: r.queueType,
        tier: r.tier,
        rank: r.rank,
        leaguePoints: r.leaguePoints,
        wins: r.wins,
        losses: r.losses,
        hotStreak: r.hotStreak,
      })),
      fetchedAt: Date.now(),
    };
  });
}

/** Drops cached profile and match lists so the next read goes to Riot. */
export function forgetPlayer(serverId: string, name: string, tag: string, puuid: string) {
  profileCache.delete(`${serverId}:${name.toLowerCase()}#${tag.toLowerCase()}`);
  idCache.deleteWhere((key) => key.startsWith(`${puuid}:`));
}

export async function getMatchPage(
  serverId: string,
  puuid: string,
  start: number,
  count: number,
  queue?: number,
): Promise<MatchPage> {
  const server = getServer(serverId);
  if (!server) throw new Error(`Unknown server ${serverId}`);

  const params = new URLSearchParams({ start: String(start), count: String(count) });
  if (queue) params.set("queue", String(queue));
  const ids = await cached(idCache, `${puuid}:${params}`, () =>
    riot<string[]>(server.region, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`),
  );

  const matches = await Promise.all(ids.map((id) => getMatch(id, server).catch(() => null)));
  return {
    matches: matches.filter((m): m is MatchSummary => m !== null),
    next: ids.length < count ? null : start + count,
  };
}

export async function getMatch(id: string, server: Server): Promise<MatchSummary> {
  const hit = matchCache.get(id);
  if (hit) return hit;

  const coll = await mongoCollection("match_summaries");
  const stored = (await coll?.findOne({ _id: id as never }).catch(() => null)) as { match?: MatchSummary } | null;
  if (stored?.match) {
    matchCache.set(id, stored.match);
    return stored.match;
  }

  const raw = await riot<RawMatch>(server.region, `/lol/match/v5/matches/${encodeURIComponent(id)}`);
  const match = summarize(raw);
  matchCache.set(id, match);
  void coll?.updateOne({ _id: id as never }, { $set: { match, savedAt: new Date() } }, { upsert: true }).catch(() => {});

  for (const p of raw.info.participants) {
    if (p.riotIdGameName && p.riotIdTagline) {
      remember({
        name: p.riotIdGameName,
        tag: p.riotIdTagline,
        server: server.id,
        profileIconId: p.profileIcon,
        level: p.summonerLevel,
      });
    }
  }
  return match;
}

interface RawParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  profileIcon: number;
  summonerLevel: number;
  teamId: number;
  win: boolean;
  championName: string;
  champLevel: number;
  teamPosition?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  largestMultiKill: number;
  gameEndedInEarlySurrender?: boolean;
  summoner1Id: number;
  summoner2Id: number;
  perks?: { styles: { style: number; selections: { perk: number }[] }[] };
  [item: `item${number}`]: number;
}

interface RawMatch {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameMode: string;
    gameCreation: number;
    gameEndTimestamp?: number;
    gameDuration: number;
    participants: RawParticipant[];
    teams: {
      teamId: number;
      win: boolean;
      objectives: Record<string, { kills: number }>;
    }[];
  };
}

function summarize(raw: RawMatch): MatchSummary {
  const { info } = raw;
  const players: MatchPlayer[] = info.participants.map((p) => ({
    puuid: p.puuid,
    name: p.riotIdGameName || "?",
    tag: p.riotIdTagline || "",
    teamId: p.teamId,
    win: p.win,
    champion: p.championName,
    championLevel: p.champLevel,
    position: p.teamPosition || "",
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    gold: p.goldEarned,
    damage: p.totalDamageDealtToChampions,
    damageTaken: p.totalDamageTaken,
    vision: p.visionScore,
    items: [0, 1, 2, 3, 4, 5, 6].map((i) => p[`item${i}`] || 0),
    spells: [p.summoner1Id, p.summoner2Id],
    keystone: p.perks?.styles[0]?.selections[0]?.perk ?? 0,
    secondaryStyle: p.perks?.styles[1]?.style ?? 0,
    multiKill: p.largestMultiKill,
  }));

  return {
    id: raw.metadata.matchId,
    queueId: info.queueId,
    mode: info.gameMode,
    createdAt: info.gameCreation,
    endedAt: info.gameEndTimestamp ?? info.gameCreation + info.gameDuration * 1000,
    duration: info.gameDuration,
    remake: info.participants.some((p) => p.gameEndedInEarlySurrender) || info.gameDuration < 240,
    teams: info.teams.map((t) => ({
      teamId: t.teamId,
      win: t.win,
      kills: t.objectives.champion?.kills ?? 0,
      towers: t.objectives.tower?.kills ?? 0,
      dragons: t.objectives.dragon?.kills ?? 0,
      barons: t.objectives.baron?.kills ?? 0,
    })),
    players,
  };
}
