export type Region = "americas" | "europe" | "asia" | "sea";

export interface Server {
  id: string;
  label: string;
  name: string;
  platform: string;
  region: Region;
}

export const SERVERS: Server[] = [
  { id: "tr", label: "TR", name: "Türkiye", platform: "tr1", region: "europe" },
  { id: "euw", label: "EUW", name: "Europe West", platform: "euw1", region: "europe" },
  { id: "eune", label: "EUNE", name: "Europe Nordic & East", platform: "eun1", region: "europe" },
  { id: "na", label: "NA", name: "North America", platform: "na1", region: "americas" },
  { id: "kr", label: "KR", name: "Korea", platform: "kr", region: "asia" },
  { id: "jp", label: "JP", name: "Japan", platform: "jp1", region: "asia" },
  { id: "br", label: "BR", name: "Brazil", platform: "br1", region: "americas" },
  { id: "lan", label: "LAN", name: "Latin America North", platform: "la1", region: "americas" },
  { id: "las", label: "LAS", name: "Latin America South", platform: "la2", region: "americas" },
  { id: "oce", label: "OCE", name: "Oceania", platform: "oc1", region: "sea" },
  { id: "ru", label: "RU", name: "Russia", platform: "ru", region: "europe" },
];

export const DEFAULT_SERVER = "tr";

export function getServer(id: string | undefined): Server | undefined {
  return SERVERS.find((s) => s.id === id?.toLowerCase());
}

/** Match IDs are prefixed with the platform, e.g. "TR1_1234567". */
export function serverForMatchId(matchId: string): Server | undefined {
  const platform = matchId.split("_")[0]?.toLowerCase();
  return SERVERS.find((s) => s.platform === platform);
}

export const RANKED_QUEUES = {
  solo: "RANKED_SOLO_5x5",
  flex: "RANKED_FLEX_SR",
} as const;

export type RankedQueueKey = keyof typeof RANKED_QUEUES;

/** Queue ids the match filter offers, keyed to dictionary entries. */
export const QUEUE_IDS: Record<number, string> = {
  420: "queue_solo",
  440: "queue_flex",
  400: "queue_draft",
  430: "queue_blind",
  490: "queue_quickplay",
  450: "queue_aram",
  700: "queue_clash",
  900: "queue_urf",
  1700: "queue_arena",
  1710: "queue_arena",
  1750: "queue_arena",
};

/** Riot IDs live in the URL as "name-tag"; tags never contain a dash. */
export function riotIdToSlug(name: string, tag: string): string {
  return encodeURIComponent(`${name}-${tag}`);
}

export function slugToRiotId(slug: string): { name: string; tag: string } | null {
  const decoded = decodeURIComponent(slug);
  const cut = decoded.lastIndexOf("-");
  if (cut <= 0 || cut === decoded.length - 1) return null;
  return { name: decoded.slice(0, cut), tag: decoded.slice(cut + 1) };
}

export function parseRiotIdInput(input: string): { name: string; tag: string } | null {
  const cut = input.lastIndexOf("#");
  if (cut <= 0) return null;
  const name = input.slice(0, cut).trim();
  const tag = input.slice(cut + 1).trim();
  if (!name || !tag) return null;
  return { name, tag };
}
