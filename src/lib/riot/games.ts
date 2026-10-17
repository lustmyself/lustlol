import "server-only";
import { mongoCollection } from "@/lib/cache";
import type { MatchSummary } from "./types";

/** One player's line from one game, kept so season stats don't need the full match. */
export interface PlayerGame {
  puuid: string;
  matchId: string;
  queueId: number;
  createdAt: number;
  remake: boolean;
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  duration: number;
  /** Added later; rows saved before then lack them. */
  teamId?: number;
  name?: string;
  tag?: string;
}

let indexed = false;
async function collection() {
  const coll = await mongoCollection("player_games");
  if (coll && !indexed) {
    indexed = true;
    void coll.createIndex({ puuid: 1, createdAt: -1 }).catch(() => (indexed = false));
    void coll.createIndex({ matchId: 1 }).catch(() => (indexed = false));
  }
  return coll;
}

export interface NameSeen {
  puuid: string;
  name: string;
  tag: string;
  lastSeen: number;
}

const namesInMemory = new Map<string, NameSeen>();

/** Permanent record of every Riot ID a player has been seen with. Nothing ever deletes from it. */
async function rememberNames(rows: PlayerGame[]) {
  const seen = rows
    .filter((r) => r.name && r.name !== "?")
    .map((r) => ({
      id: `${r.puuid}:${r.name!.toLowerCase()}#${(r.tag ?? "").toLowerCase()}`,
      row: { puuid: r.puuid, name: r.name!, tag: r.tag ?? "", lastSeen: r.createdAt },
    }));
  const coll = await mongoCollection("name_history");
  if (!coll) {
    for (const { id, row } of seen) {
      const prev = namesInMemory.get(id);
      if (!prev || prev.lastSeen < row.lastSeen) namesInMemory.set(id, row);
    }
    return;
  }
  await coll
    .bulkWrite(
      seen.map(({ id, row }) => ({
        updateOne: {
          filter: { _id: id as never },
          update: { $set: { puuid: row.puuid, name: row.name, tag: row.tag }, $max: { lastSeen: row.lastSeen } },
          upsert: true,
        },
      })),
      { ordered: false },
    )
    .catch(() => {});
}

export async function namesOf(puuid: string): Promise<NameSeen[]> {
  const coll = await mongoCollection("name_history");
  if (!coll) return [...namesInMemory.values()].filter((n) => n.puuid === puuid);
  return (await coll.find({ puuid }, { projection: { _id: 0 } }).toArray().catch(() => [])) as unknown as NameSeen[];
}

// Without MongoDB the rows live here and are lost on restart.
const memory = new Map<string, Map<string, PlayerGame>>();

export async function indexMatch(m: MatchSummary): Promise<void> {
  const rows: PlayerGame[] = m.players.map((p) => ({
    puuid: p.puuid,
    matchId: m.id,
    queueId: m.queueId,
    createdAt: m.createdAt,
    remake: m.remake,
    champion: p.champion,
    win: p.win,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.cs,
    duration: m.duration,
    teamId: p.teamId,
    name: p.name,
    tag: p.tag,
  }));

  await rememberNames(rows);

  const coll = await collection();
  if (coll) {
    await coll
      .bulkWrite(
        rows.map((r) => ({
          updateOne: { filter: { _id: `${r.matchId}:${r.puuid}` as never }, update: { $set: r }, upsert: true },
        })),
        { ordered: false },
      )
      .catch(() => {});
    return;
  }
  for (const r of rows) {
    if (!memory.has(r.puuid)) memory.set(r.puuid, new Map());
    memory.get(r.puuid)!.set(r.matchId, r);
  }
}

/** Matches already stored for this player. Rows saved before names were kept count as missing, so they get redone. */
export async function knownMatchIds(puuid: string, ids: string[]): Promise<Set<string>> {
  const coll = await collection();
  if (!coll) return new Set(ids.filter((id) => memory.get(puuid)?.get(id)?.name));
  const docs = await coll
    .find({ _id: { $in: ids.map((id) => `${id}:${puuid}`) } as never, name: { $exists: true } }, { projection: { matchId: 1 } })
    .toArray()
    .catch(() => []);
  return new Set(docs.map((d) => d.matchId as string));
}

export async function gamesSince(puuid: string, since: number, queues: number[]): Promise<PlayerGame[]> {
  const coll = await collection();
  if (!coll) {
    return [...(memory.get(puuid)?.values() ?? [])].filter((g) => g.createdAt >= since && queues.includes(g.queueId));
  }
  return (await coll
    .find({ puuid, createdAt: { $gte: since }, queueId: { $in: queues } }, { projection: { _id: 0 } })
    .toArray()
    .catch(() => [])) as unknown as PlayerGame[];
}

/** Everyone else's rows from these matches. */
export async function othersIn(puuid: string, matchIds: string[]): Promise<PlayerGame[]> {
  if (matchIds.length === 0) return [];
  const coll = await collection();
  if (!coll) {
    const ids = new Set(matchIds);
    return [...memory.entries()]
      .filter(([p]) => p !== puuid)
      .flatMap(([, rows]) => [...rows.values()].filter((r) => ids.has(r.matchId)));
  }
  return (await coll
    .find({ matchId: { $in: matchIds }, puuid: { $ne: puuid } }, { projection: { _id: 0 } })
    .toArray()
    .catch(() => [])) as unknown as PlayerGame[];
}

export interface GameFilter {
  champion?: string;
  queue?: number;
  /** Only games where this player was on the same team. */
  withPuuid?: string;
}

/** Stored games of one player matching the filter, newest first. */
export async function filteredMatchIds(puuid: string, f: GameFilter): Promise<string[]> {
  const coll = await collection();
  let mine: PlayerGame[];
  if (coll) {
    const query: Record<string, unknown> = { puuid };
    if (f.champion) query.champion = f.champion;
    if (f.queue) query.queueId = f.queue;
    mine = (await coll
      .find(query, { projection: { _id: 0, matchId: 1, createdAt: 1, teamId: 1, win: 1 } })
      .toArray()
      .catch(() => [])) as unknown as PlayerGame[];
  } else {
    mine = [...(memory.get(puuid)?.values() ?? [])].filter(
      (g) => (!f.champion || g.champion === f.champion) && (!f.queue || g.queueId === f.queue),
    );
  }

  if (f.withPuuid) {
    const theirs = new Map((await othersIn(puuid, mine.map((g) => g.matchId))).filter((o) => o.puuid === f.withPuuid).map((o) => [o.matchId, o]));
    mine = mine.filter((g) => {
      const o = theirs.get(g.matchId);
      if (!o) return false;
      return o.teamId !== undefined && g.teamId !== undefined ? o.teamId === g.teamId : o.win === g.win;
    });
  }

  return mine.sort((a, b) => b.createdAt - a.createdAt).map((g) => g.matchId);
}
