import "server-only";
import { mongoCollection } from "@/lib/cache";
import { RiotError, hasRiotKey } from "./client";
import { getProfile, knownPlayers } from "./player";
import { parseRiotIdInput } from "./servers";
import type { SearchSuggestion } from "./types";

const TIER_ORDER = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "EMERALD", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"];

function score(p: SearchSuggestion, name: string, server: string) {
  const exact = p.name.toLowerCase() === name ? 1 : 0;
  const sameServer = p.server === server ? 1 : 0;
  const tier = p.tier ? TIER_ORDER.length - TIER_ORDER.indexOf(p.tier) : 0;
  return exact * 1e6 + sameServer * 1e5 + tier * 1e3 + Math.min(p.level, 999);
}

/**
 * Players matching what was typed: everyone we've already seen, plus a live
 * lookup on the chosen server when a full Name#TAG was typed.
 */
export async function suggest(query: string, server: string): Promise<SearchSuggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const [name, tag = ""] = q.split("#");

  const found = new Map<string, SearchSuggestion>();
  const add = (p: SearchSuggestion) => found.set(`${p.server}:${p.name.toLowerCase()}#${p.tag.toLowerCase()}`, p);

  for (const p of knownPlayers.values()) {
    if (p.name.toLowerCase().startsWith(name) && p.tag.toLowerCase().startsWith(tag)) add(p);
  }

  const coll = await mongoCollection("players");
  if (coll && found.size < 8) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rows = await coll
      .find({ name: { $regex: `^${escaped}`, $options: "i" } })
      .limit(20)
      .toArray()
      .catch(() => []);
    for (const r of rows) add(r as unknown as SearchSuggestion);
  }

  const riotId = parseRiotIdInput(query);
  if (riotId && hasRiotKey()) {
    try {
      const p = await getProfile(server, riotId.name, riotId.tag);
      const solo = p.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
      add({ name: p.name, tag: p.tag, server, profileIconId: p.profileIconId, level: p.level, tier: solo?.tier, rank: solo?.rank });
    } catch (e) {
      if (!(e instanceof RiotError)) throw e;
    }
  }

  return [...found.values()].sort((a, b) => score(b, name, server) - score(a, name, server)).slice(0, 8);
}
