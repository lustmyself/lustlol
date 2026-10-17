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
}

let indexed = false;
async function collection() {
  const coll = await mongoCollection("player_games");
  if (coll && !indexed) {
    indexed = true;
    void coll.createIndex({ puuid: 1, createdAt: -1 }).catch(() => (indexed = false));
  }
  return coll;
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
  }));

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

export async function knownMatchIds(puuid: string, ids: string[]): Promise<Set<string>> {
  const coll = await collection();
  if (!coll) return new Set(ids.filter((id) => memory.get(puuid)?.has(id)));
  const docs = await coll
    .find({ _id: { $in: ids.map((id) => `${id}:${puuid}`) } as never }, { projection: { matchId: 1 } })
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
