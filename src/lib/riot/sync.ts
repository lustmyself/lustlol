import "server-only";
import { riot } from "./client";
import { gamesSince, indexMatch, knownMatchIds, othersIn, type PlayerGame } from "./games";
import { getMatch } from "./player";
import { getServer } from "./servers";

// Season stats cover every ranked game, which can mean hundreds of match
// requests. They are fetched once in the background at low priority and
// stored; after that only new games are fetched.

export const RANKED_QUEUE_IDS = [420, 440];
const RECHECK_MS = 10 * 60_000;

export function seasonStart(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), 0, 1);
}

interface SyncState {
  running: boolean;
  total: number;
  fetched: number;
  checkedAt: number;
  error: string | null;
}

const states = new Map<string, SyncState>();

/** Every game this season in any queue: champion stats use the ranked ones, duos use them all. */
async function listSeasonIds(region: string, puuid: string, since: number): Promise<string[]> {
  const ids: string[] = [];
  for (let start = 0; ; start += 100) {
    const page = await riot<string[]>(
      region,
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?startTime=${Math.floor(since / 1000)}&start=${start}&count=100`,
      "low",
    );
    ids.push(...page);
    if (page.length < 100) break;
  }
  return ids;
}

async function run(serverId: string, puuid: string, state: SyncState) {
  const server = getServer(serverId)!;
  try {
    const ids = await listSeasonIds(server.region, puuid, seasonStart());
    const known = await knownMatchIds(puuid, ids);
    const missing = ids.filter((id) => !known.has(id));
    state.total = ids.length;
    state.fetched = ids.length - missing.length;

    // A few at a time; the limiter decides the real pace.
    for (let i = 0; i < missing.length; i += 5) {
      await Promise.all(
        missing.slice(i, i + 5).map((id) =>
          getMatch(id, server, "low")
            // Matches saved before stats existed come back from cache unindexed.
            .then((m) => indexMatch(m))
            .then(() => state.fetched++)
            .catch(() => {}),
        ),
      );
    }
    state.error = null;
  } catch (e) {
    state.error = e instanceof Error ? e.message : "sync failed";
  } finally {
    state.running = false;
    state.checkedAt = Date.now();
  }
}

export interface ChampionLine {
  champion: string;
  queueId: number;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  minutes: number;
}

export interface Duo {
  puuid: string;
  name: string;
  tag: string;
  games: number;
  wins: number;
}

export const DUO_MIN_GAMES = 8;

// Arena teams are pairs or trios inside a big lobby; 'same team' there isn't comparable.
const ARENA_QUEUES = new Set([1700, 1710, 1750]);

export interface SeasonStats {
  syncing: boolean;
  total: number;
  fetched: number;
  champions: ChampionLine[];
  duos: Duo[];
}

/** Teammates from this season's games in every mode but Arena, with at least DUO_MIN_GAMES together. */
async function duos(serverId: string, puuid: string, games: PlayerGame[]): Promise<Duo[]> {
  const mine = new Map(games.filter((g) => !g.remake && !ARENA_QUEUES.has(g.queueId)).map((g) => [g.matchId, g]));
  const others = await othersIn(puuid, [...mine.keys()]);

  const found = new Map<string, Duo & { lastMatch: string }>();
  for (const o of others) {
    const me = mine.get(o.matchId)!;
    // Older rows have no teamId; in ranked the winners are always one team.
    const sameTeam = o.teamId !== undefined && me.teamId !== undefined ? o.teamId === me.teamId : o.win === me.win;
    if (!sameTeam) continue;
    const d = found.get(o.puuid) ?? { puuid: o.puuid, name: "", tag: "", games: 0, wins: 0, lastMatch: o.matchId };
    d.games++;
    d.wins += me.win ? 1 : 0;
    if (o.name && !d.name) {
      d.name = o.name;
      d.tag = o.tag ?? "";
    }
    found.set(o.puuid, d);
  }

  const server = getServer(serverId)!;
  const top = [...found.values()].filter((d) => d.games >= DUO_MIN_GAMES).sort((a, b) => b.games - a.games || b.wins - a.wins);
  await Promise.all(
    top
      .filter((d) => !d.name)
      .map(async (d) => {
        // The stored summary of a shared game has their Riot ID.
        const m = await getMatch(d.lastMatch, server, "low").catch(() => null);
        const p = m?.players.find((x) => x.puuid === d.puuid);
        if (p) {
          d.name = p.name;
          d.tag = p.tag;
        }
      }),
  );
  return top.map((d) => ({ puuid: d.puuid, name: d.name, tag: d.tag, games: d.games, wins: d.wins }));
}

function byChampion(games: PlayerGame[]): ChampionLine[] {
  const lines = new Map<string, ChampionLine>();
  for (const g of games) {
    if (g.remake) continue;
    const key = `${g.champion}:${g.queueId}`;
    const l = lines.get(key) ?? { champion: g.champion, queueId: g.queueId, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, minutes: 0 };
    l.games++;
    l.wins += g.win ? 1 : 0;
    l.kills += g.kills;
    l.deaths += g.deaths;
    l.assists += g.assists;
    l.cs += g.cs;
    l.minutes += g.duration / 60;
    lines.set(key, l);
  }
  return [...lines.values()];
}

/** Starts or resumes the sync if it's due, and returns what is stored so far. */
export async function seasonStats(serverId: string, puuid: string): Promise<SeasonStats> {
  const key = `${serverId}:${puuid}`;
  let state = states.get(key);
  if (!state) states.set(key, (state = { running: false, total: 0, fetched: 0, checkedAt: 0, error: null }));

  if (!state.running && Date.now() - state.checkedAt > RECHECK_MS) {
    state.running = true;
    void run(serverId, puuid, state);
  }

  const games = await gamesSince(puuid, seasonStart());
  const ranked = games.filter((g) => RANKED_QUEUE_IDS.includes(g.queueId));
  return {
    syncing: state.running,
    total: Math.max(state.total, games.length),
    fetched: Math.max(state.fetched, games.length),
    champions: byChampion(ranked),
    duos: await duos(serverId, puuid, games),
  };
}
