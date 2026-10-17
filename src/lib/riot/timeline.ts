import "server-only";
import { MemoryCache, cached } from "@/lib/cache";
import { riot } from "./client";
import type { Server } from "./servers";

export interface TimelineObjective {
  /** Seconds into the game. */
  t: number;
  teamId: number;
  type: "DRAGON" | "BARON_NASHOR" | "RIFTHERALD" | "HORDE" | "ATAKHAN" | "TOWER" | "INHIBITOR";
  sub?: string;
}

export interface Timeline {
  /** Team gold at each minute, index = minute. */
  gold: { blue: number; red: number }[];
  objectives: TimelineObjective[];
  kills: { t: number; killer: string; victim: string }[];
  /** puuid -> item purchases in order. */
  items: Record<string, { t: number; id: number }[]>;
  /** puuid -> skill slot (1=Q 2=W 3=E 4=R) for each level-up in order. */
  skills: Record<string, number[]>;
}

interface RawEvent {
  type: string;
  timestamp: number;
  participantId?: number;
  itemId?: number;
  beforeId?: number;
  skillSlot?: number;
  levelUpType?: string;
  killerId?: number;
  victimId?: number;
  killerTeamId?: number;
  teamId?: number;
  monsterType?: string;
  monsterSubType?: string;
  buildingType?: string;
}

interface RawTimeline {
  info: {
    participants: { participantId: number; puuid: string }[];
    frames: { timestamp: number; participantFrames: Record<string, { totalGold: number }>; events: RawEvent[] }[];
  };
}

const cache = new MemoryCache<Timeline>(6 * 60 * 60_000, 300);

/** Minute-by-minute data for one match, trimmed to what the match page shows. One request, cached in memory. */
export async function getTimeline(matchId: string, server: Server): Promise<Timeline> {
  return cached(cache, matchId, async () => {
    const raw = await riot<RawTimeline>(server.region, `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`);
    const puuidOf = new Map(raw.info.participants.map((p) => [p.participantId, p.puuid]));
    const team = (id: number) => (id <= 5 ? 100 : 200);

    const gold = raw.info.frames.map((f) => {
      let blue = 0;
      let red = 0;
      for (const [id, pf] of Object.entries(f.participantFrames)) {
        if (team(Number(id)) === 100) blue += pf.totalGold;
        else red += pf.totalGold;
      }
      return { blue, red };
    });

    const objectives: TimelineObjective[] = [];
    const kills: Timeline["kills"] = [];
    const items: Timeline["items"] = {};
    const skills: Timeline["skills"] = {};

    for (const f of raw.info.frames) {
      for (const e of f.events) {
        const t = Math.round(e.timestamp / 1000);
        const who = e.participantId ? puuidOf.get(e.participantId) : undefined;
        switch (e.type) {
          case "ITEM_PURCHASED":
            if (who && e.itemId) (items[who] ??= []).push({ t, id: e.itemId });
            break;
          case "ITEM_UNDO": {
            // An undone purchase shouldn't show in the build.
            const list = who ? items[who] : undefined;
            if (list && e.beforeId) {
              const i = list.map((x) => x.id).lastIndexOf(e.beforeId);
              if (i >= 0) list.splice(i, 1);
            }
            break;
          }
          case "SKILL_LEVEL_UP":
            if (who && e.skillSlot && e.levelUpType !== "EVOLVE") (skills[who] ??= []).push(e.skillSlot);
            break;
          case "CHAMPION_KILL": {
            const killer = e.killerId ? puuidOf.get(e.killerId) : undefined;
            const victim = e.victimId ? puuidOf.get(e.victimId) : undefined;
            if (victim) kills.push({ t, killer: killer ?? "", victim });
            break;
          }
          case "ELITE_MONSTER_KILL":
            if (e.monsterType && e.killerTeamId) {
              objectives.push({ t, teamId: e.killerTeamId, type: e.monsterType as TimelineObjective["type"], sub: e.monsterSubType });
            }
            break;
          case "BUILDING_KILL":
            // teamId is the side that lost the building.
            if (e.teamId) {
              objectives.push({ t, teamId: e.teamId === 100 ? 200 : 100, type: e.buildingType === "INHIBITOR_BUILDING" ? "INHIBITOR" : "TOWER" });
            }
            break;
        }
      }
    }

    return { gold, objectives, kills, items, skills };
  });
}
