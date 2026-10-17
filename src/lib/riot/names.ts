import "server-only";
import { mongoCollection } from "@/lib/cache";
import { matchesInMemory } from "./player";

export interface PastName {
  name: string;
  tag: string;
  /** When this name was last seen in a game. */
  lastSeen: number;
}

let indexed = false;

/**
 * Riot keeps no name history, but every stored game records the Riot ID the
 * player had at the time, so older names can be read back from those.
 */
export async function pastNames(puuid: string, current: { name: string; tag: string }): Promise<PastName[]> {
  const seen = new Map<string, PastName>();
  const add = (name: string, tag: string, at: number) => {
    if (!name || name === "?") return;
    const key = `${name.toLowerCase()}#${tag.toLowerCase()}`;
    const prev = seen.get(key);
    if (!prev || prev.lastSeen < at) seen.set(key, { name, tag, lastSeen: at });
  };

  const coll = await mongoCollection("match_summaries");
  if (coll) {
    if (!indexed) {
      indexed = true;
      void coll.createIndex({ "match.players.puuid": 1 }).catch(() => (indexed = false));
    }
    const docs = await coll
      .find({ "match.players.puuid": puuid }, { projection: { "match.createdAt": 1, "match.players.$": 1 } })
      .toArray()
      .catch(() => []);
    for (const d of docs) {
      const m = d.match as { createdAt: number; players: { name: string; tag: string }[] };
      const p = m?.players?.[0];
      if (p) add(p.name, p.tag, m.createdAt);
    }
  } else {
    for (const m of matchesInMemory()) {
      const p = m.players.find((x) => x.puuid === puuid);
      if (p) add(p.name, p.tag, m.createdAt);
    }
  }

  const now = `${current.name.toLowerCase()}#${current.tag.toLowerCase()}`;
  return [...seen.entries()]
    .filter(([key]) => key !== now)
    .map(([, v]) => v)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}
