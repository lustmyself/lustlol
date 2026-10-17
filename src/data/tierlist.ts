// Hand-picked, not computed. Update this list each patch.
// Champion ids are Data Dragon ids (e.g. "MonkeyKing" for Wukong).

export type Role = "top" | "jungle" | "mid" | "bot" | "support";
export type Tier = "S+" | "S" | "A";

export const TIER_LIST: Record<Role, Partial<Record<Tier, string[]>>> = {
  top: { "S+": ["Aatrox", "Ambessa"], S: ["Camille", "Jax", "KSante"], A: ["Darius", "Garen", "Renekton"] },
  jungle: { "S+": ["LeeSin", "Viego"], S: ["Graves", "Sejuani", "XinZhao"], A: ["Vi", "Nocturne", "Kayn"] },
  mid: { "S+": ["Ahri", "Sylas"], S: ["Orianna", "Yone", "Syndra"], A: ["Viktor", "Akali", "Galio"] },
  bot: { "S+": ["Jinx", "Kaisa"], S: ["Varus", "Ezreal", "Ashe"], A: ["Tristana", "Caitlyn", "Draven"] },
  support: { "S+": ["Nautilus", "Thresh"], S: ["Lulu", "Leona", "Rakan"], A: ["Braum", "Karma", "Milio"] },
};
