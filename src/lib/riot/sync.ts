import "server-only";
import { riot } from "./client";
import { gamesSince, indexMatch, knownMatchIds, type PlayerGame } from "./games";
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

async function listSeasonIds(region: string, puuid: string, since: number): Promise<string[]> {
  const ids: string[] = [];
  for (const queue of RANKED_QUEUE_IDS) {
    for (let start = 0; ; start += 100) {
      const page = await riot<string[]>(
        region,
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?queue=${queue}&startTime=${Math.floor(since / 1000)}&start=${start}&count=100`,
        "low",
      );
      ids.push(...page);
      if (page.length < 100) break;
    }
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

export interface SeasonStats {
  syncing: boolean;
  total: number;
  fetched: number;
  champions: ChampionLine[];
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

  const games = await gamesSince(puuid, seasonStart(), RANKED_QUEUE_IDS);
  return {
    syncing: state.running,
    total: Math.max(state.total, games.length),
    fetched: Math.max(state.fetched, games.length),
    champions: byChampion(games),
  };
}
