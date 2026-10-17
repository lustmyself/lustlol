import { QUEUE_IDS } from "./riot/servers";
import type { DictKey } from "./i18n/dictionaries";

const CDRAGON = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images";

export function tierName(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export function rankLabel(tier: string, rank: string): string {
  return APEX.has(tier) ? tierName(tier) : `${tierName(tier)} ${rank}`;
}

export function rankEmblem(tier: string | undefined): string {
  return `${CDRAGON}/ranked-emblem/emblem-${(tier || "unranked").toLowerCase()}.png`;
}

export const TIER_COLORS: Record<string, string> = {
  IRON: "#7d6f6a",
  BRONZE: "#a8704d",
  SILVER: "#9aa7b4",
  GOLD: "#d4b46a",
  PLATINUM: "#4fb3a9",
  EMERALD: "#36b37e",
  DIAMOND: "#6f8ff7",
  MASTER: "#b36ae6",
  GRANDMASTER: "#e3545f",
  CHALLENGER: "#f4d27a",
};

export function kdaRatio(k: number, d: number, a: number): string {
  if (d === 0) return k + a > 0 ? "Perfect" : "0.00";
  return ((k + a) / d).toFixed(2);
}

export function kdaColor(k: number, d: number, a: number): string {
  const r = d === 0 ? 99 : (k + a) / d;
  if (r >= 5) return "text-gold";
  if (r >= 3) return "text-teal";
  if (r >= 2) return "text-text";
  return "text-muted";
}

export function winrateColor(wr: number): string {
  if (wr >= 60) return "text-gold";
  if (wr >= 52) return "text-teal";
  if (wr >= 48) return "text-text";
  return "text-loss";
}

export function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function queueKey(queueId: number): DictKey | null {
  return (QUEUE_IDS[queueId] as DictKey) ?? null;
}

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];

/** One number that orders any rank: tier, then division, then LP. */
export function rankScore(s: { tier: string; rank: string; leaguePoints: number }): number {
  // Master and above share one LP ladder, so they sit on the same base.
  const tier = Math.min(TIER_ORDER.indexOf(s.tier), TIER_ORDER.indexOf("MASTER"));
  const division = APEX.has(s.tier) ? 0 : Math.max(0, DIVISIONS.indexOf(s.rank));
  return tier * 400 + division * 100 + s.leaguePoints;
}

/** Short label like "GM 1" or "D2" for chart points. */
export function shortRank(s: { tier: string; rank: string }): string {
  const short: Record<string, string> = {
    IRON: "I",
    BRONZE: "B",
    SILVER: "S",
    GOLD: "G",
    PLATINUM: "P",
    EMERALD: "E",
    DIAMOND: "D",
    MASTER: "M",
    GRANDMASTER: "GM",
    CHALLENGER: "C",
  };
  return APEX.has(s.tier) ? short[s.tier] : `${short[s.tier]}${DIVISIONS.indexOf(s.rank) >= 0 ? 4 - DIVISIONS.indexOf(s.rank) : ""}`;
}
