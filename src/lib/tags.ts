import type { DictKey } from "./i18n/dictionaries";
import type { MatchPlayer, MatchSummary } from "./riot/types";

export interface Tag {
  key: DictKey;
  tone: "good" | "bad";
  /** Hover text explaining the verdict, with the numbers behind it. */
  why: DictKey;
  vars: Record<string, string | number>;
}

const NO_LANE_QUEUES = new Set([450, 900, 1700, 1710, 1750]); // ARAM, URF, Arena

const pct = (x: number) => Math.round(x * 100);

/** Short verdicts on one player's game, good ones first. Needs a v2 summary. */
export function performanceTags(m: MatchSummary, p: MatchPlayer): Tag[] {
  const x = p.extra;
  if (!x || m.remake) return [];

  const minutes = m.duration / 60;
  const csPerMin = p.cs / minutes;
  const support = p.position === "UTILITY";
  const jungle = p.position === "JUNGLE";
  const laned = !NO_LANE_QUEUES.has(m.queueId);
  const kda = p.deaths === 0 ? p.kills + p.assists : (p.kills + p.assists) / p.deaths;
  // Arena pairs make team-share numbers meaningless; only judge the fight itself.
  const teamGame = m.mode !== "CHERRY";
  const vars = {
    k: p.kills,
    d: p.deaths,
    a: p.assists,
    kda: kda.toFixed(2),
    dmg: pct(x.damageShare),
    kp: pct(x.killParticipation),
    solo: x.soloKills,
    csAdv: x.csAdvantage,
    lvl: x.levelLead,
    cspm: csPerMin.toFixed(1),
    turrets: x.turretTakedowns,
    plates: x.platesTaken,
    barons: x.baronTakedowns,
    dragons: x.dragonTakedowns,
    vpm: x.visionPerMin.toFixed(2),
    wards: x.controlWards,
    min: Math.round(minutes),
  };

  const good: [boolean, DictKey][] = [
    [p.deaths === 0 && p.kills + p.assists >= 3, "tag_unkillable"],
    [kda >= 4 && p.deaths <= 6 && p.deaths > 0, "tag_high_kda"],
    [teamGame && x.damageShare >= 0.3, "tag_high_damage"],
    [teamGame && x.killParticipation >= 0.7, "tag_teamplayer"],
    [x.soloKills >= 3, "tag_solo_killer"],
    [laned && !jungle && !support && (x.csAdvantage >= 20 || x.levelLead >= 2), "tag_aggressive_laner"],
    [laned && !support && csPerMin >= 8, "tag_good_cs"],
    [laned && x.turretTakedowns >= 3, "tag_turrets"],
    [laned && x.firstTower, "tag_first_tower"],
    [laned && x.platesTaken >= 4, "tag_plates"],
    [laned && x.baronTakedowns >= 1, "tag_baron"],
    [laned && jungle && x.dragonTakedowns >= 3, "tag_dragons"],
    [laned && x.visionPerMin >= (support ? 2.5 : 1.5), "tag_vision"],
  ];
  const bad: [boolean, DictKey][] = [
    [p.deaths >= 10, "tag_many_deaths"],
    [teamGame && !support && x.damageShare > 0 && x.damageShare < 0.12, "tag_low_damage"],
    [laned && !support && csPerMin < 5, "tag_bad_cs"],
    [laned && minutes >= 20 && x.controlWards === 0, "tag_no_control_wards"],
    [teamGame && x.killParticipation > 0 && x.killParticipation < 0.3, "tag_low_kp"],
  ];

  const make =
    (tone: Tag["tone"]) =>
    ([, key]: [boolean, DictKey]): Tag => ({ key, tone, why: `${key}_why` as DictKey, vars });
  return [...good.filter(([on]) => on).map(make("good")), ...bad.filter(([on]) => on).map(make("bad"))];
}
