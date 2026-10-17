// Shapes the site works with. Raw Riot payloads are trimmed to these on the server.

export interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface TierStep {
  tier: string;
  rank: string;
  leaguePoints: number;
}

/** One queue in one season, as recorded by this site. */
export interface SeasonRank {
  season: string;
  queueType: string;
  peak: TierStep;
  last: TierStep;
  updatedAt: number;
}

export interface Profile {
  puuid: string;
  name: string;
  tag: string;
  server: string;
  level: number;
  profileIconId: number;
  ranked: RankedEntry[];
  fetchedAt: number;
}

export interface MatchPlayer {
  puuid: string;
  name: string;
  tag: string;
  teamId: number;
  win: boolean;
  champion: string;
  championLevel: number;
  position: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  damageTaken: number;
  vision: number;
  items: number[];
  spells: [number, number];
  keystone: number;
  secondaryStyle: number;
  multiKill: number;
  /** Added in summary v2; older stored matches don't have it. */
  extra?: PlayerExtra;
  /** Arena: which pair the player was in, and where the pair finished. */
  subteam?: number;
  placement?: number;
}

export interface PlayerExtra {
  damageShare: number;
  killParticipation: number;
  soloKills: number;
  controlWards: number;
  visionPerMin: number;
  csAdvantage: number;
  levelLead: number;
  baronTakedowns: number;
  dragonTakedowns: number;
  turretTakedowns: number;
  buildingDamage: number;
  firstTower: boolean;
  platesTaken: number;
}

export interface MatchTeam {
  teamId: number;
  win: boolean;
  kills: number;
  towers: number;
  dragons: number;
  barons: number;
}

export interface MatchSummary {
  /** Shape version; bump when summarize() starts keeping new fields. */
  v?: number;
  id: string;
  queueId: number;
  mode: string;
  createdAt: number;
  endedAt: number;
  duration: number;
  remake: boolean;
  teams: MatchTeam[];
  players: MatchPlayer[];
}

export interface MatchPage {
  matches: MatchSummary[];
  /** Start index of the next page, or null when Riot returned fewer than asked. */
  next: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  puuid: string;
  name: string | null;
  tag: string | null;
  profileIconId: number | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
}

export interface SearchSuggestion {
  name: string;
  tag: string;
  server: string;
  profileIconId: number;
  level: number;
  tier?: string;
  rank?: string;
}

export type ApiErrorCode = "no_key" | "bad_key" | "not_found" | "rate_limited" | "unavailable";
