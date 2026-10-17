export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";

const tr = {
  nav_home: "Ana Sayfa",
  nav_leaderboard: "Sıralama",
  nav_tierlist: "Tier List",
  nav_patch: "Yama Notları",

  search_placeholder: "Riot ID ara: İsim#TAG",
  search_hint: "İsim ve etiketi # ile yaz, örnek: lust#77",
  search_go: "Ara",
  search_bad_format: "Riot ID İsim#TAG biçiminde olmalı.",
  search_recent: "Son aramalar",
  search_clear: "Temizle",
  search_no_results: "Eşleşen oyuncu yok. Tam Riot ID yazıp Enter'a bas.",

  hero_title: "Her oyuncunun hikayesi, tek aramada.",
  hero_sub: "Dereceli lig, maç geçmişi, en çok oynanan şampiyonlar ve duo partnerleri. Tüm sunucularda, doğrudan Riot verisiyle.",

  home_patch_title: "Yama {v} özeti",
  home_patch_all: "Tüm yama notları",
  home_leaderboard_title: "Challenger sıralaması",
  home_leaderboard_all: "Tam sıralama",

  buff: "Güçlendirme",
  nerf: "Zayıflatma",
  adjusted: "Düzenleme",
  buffs: "Güçlendirmeler",
  nerfs: "Zayıflatmalar",
  adjusteds: "Düzenlemeler",
  champions: "Şampiyonlar",
  items: "Eşyalar",
  patch_source: "Kaynak: Riot Games yama notları",
  patch_unavailable: "Yama notları şu an alınamadı.",

  level: "Seviye",
  refresh: "Güncelle",
  refreshed: "Güncellendi",
  updated_ago: "Son güncelleme: {t}",
  ranked_solo: "Tekli/Çiftli",
  ranked_flex: "Esnek",
  unranked: "Derecesiz",
  wins_losses: "{w}G {l}M",
  winrate: "Kazanma",
  lp: "LP",

  season_history: "Sezon geçmişi",
  season_history_note: "lustlol kayıtları",
  season_peak: "Bu sezon en yüksek {r} oldu.",
  season_peak_now: "Bu sezon şu ana kadar en yüksek {r}.",
  season_end: "Sezon sonunda {r} idi.",
  season_now: "Şu an {r}.",

  champ_stats: "Şampiyon istatistikleri",
  champ_stats_note: "Yüklenen {n} maçtan",
  duo_title: "Birlikte oynadıkları",
  duo_note: "En az 2 maç, yüklenen maçlardan",
  duo_none: "Yüklenen maçlarda tekrar eden takım arkadaşı yok.",
  recent_form: "Son {n} maç",

  matches: "Maç geçmişi",
  all_queues: "Tüm modlar",
  load_more: "Daha fazla maç",
  no_matches: "Bu filtrede maç bulunamadı.",
  victory: "Zafer",
  defeat: "Bozgun",
  remake: "Geçersiz",
  kda: "KDA",
  kill_participation: "Kill katılımı",
  cs: "CS",
  per_min: "/dk",
  damage: "Hasar",
  gold: "Altın",
  vision: "Görüş",
  blue_team: "Mavi takım",
  red_team: "Kırmızı takım",
  details: "Detaylar",
  towers: "Kule",
  dragons: "Ejder",
  barons: "Baron",
  multikill_2: "Çift",
  multikill_3: "Üçlü",
  multikill_4: "Dörtlü",
  multikill_5: "Penta",

  queue_solo: "Tekli/Çiftli",
  queue_flex: "Esnek",
  queue_draft: "Normal Seçmeli",
  queue_blind: "Normal Kapalı",
  queue_quickplay: "Hızlı Oyun",
  queue_aram: "ARAM",
  queue_clash: "Clash",
  queue_urf: "URF",
  queue_arena: "Arena",

  leaderboard_title: "Challenger sıralaması",
  leaderboard_sub: "{s} sunucusunun en iyi oyuncuları, Riot'tan canlı.",
  player: "Oyuncu",
  games: "Maç",
  hot_streak: "Galibiyet serisi",

  tierlist_title: "Tier list",
  tierlist_sub: "Koridorlara göre güçlü şampiyonlar. Editör seçimidir, Riot istatistiği değildir.",
  tierlist_based_on: "Yama {v} için",

  err_no_key: "Sunucuda Riot API anahtarı tanımlı değil.",
  err_bad_key: "Riot API anahtarı geçersiz ya da süresi dolmuş.",
  err_not_found: "Bu sunucuda böyle bir oyuncu yok.",
  err_rate_limited: "Riot API sınırına takıldık. Birkaç saniye sonra tekrar dene.",
  err_unavailable: "Riot sunucularına şu an ulaşılamıyor.",
  try_again: "Tekrar dene",
  back_home: "Ana sayfaya dön",

  just_now: "az önce",
  minutes_ago: "{n} dk önce",
  hours_ago: "{n} saat önce",
  days_ago: "{n} gün önce",
  months_ago: "{n} ay önce",

  footer_note: "lustlol, Riot Games tarafından onaylanmamıştır ve Riot Games'in ya da League of Legends'ın yapımında yer alan kişilerin görüşlerini yansıtmaz.",
};

export type Dictionary = typeof tr;

const en: Dictionary = {
  nav_home: "Home",
  nav_leaderboard: "Leaderboard",
  nav_tierlist: "Tier List",
  nav_patch: "Patch Notes",

  search_placeholder: "Search a Riot ID: Name#TAG",
  search_hint: "Type the name and tag with #, e.g. lust#77",
  search_go: "Search",
  search_bad_format: "A Riot ID looks like Name#TAG.",
  search_recent: "Recent searches",
  search_clear: "Clear",
  search_no_results: "No matching players. Type the full Riot ID and press Enter.",

  hero_title: "Every player's story, one search away.",
  hero_sub: "Ranked standing, match history, most played champions and duo partners. Every server, straight from Riot's data.",

  home_patch_title: "Patch {v} at a glance",
  home_patch_all: "Full patch notes",
  home_leaderboard_title: "Challenger ladder",
  home_leaderboard_all: "Full leaderboard",

  buff: "Buff",
  nerf: "Nerf",
  adjusted: "Adjusted",
  buffs: "Buffs",
  nerfs: "Nerfs",
  adjusteds: "Adjustments",
  champions: "Champions",
  items: "Items",
  patch_source: "Source: Riot Games patch notes",
  patch_unavailable: "Patch notes are unavailable right now.",

  level: "Level",
  refresh: "Update",
  refreshed: "Updated",
  updated_ago: "Updated {t}",
  ranked_solo: "Ranked Solo/Duo",
  ranked_flex: "Ranked Flex",
  unranked: "Unranked",
  wins_losses: "{w}W {l}L",
  winrate: "Win rate",
  lp: "LP",

  season_history: "Season history",
  season_history_note: "Recorded by lustlol",
  season_peak: "Peaked at {r} this season.",
  season_peak_now: "Highest so far this season: {r}.",
  season_end: "Ended the season at {r}.",
  season_now: "Currently {r}.",

  champ_stats: "Champion stats",
  champ_stats_note: "From {n} loaded games",
  duo_title: "Played with",
  duo_note: "2+ games, from loaded matches",
  duo_none: "No repeat teammates in the loaded matches.",
  recent_form: "Last {n} games",

  matches: "Match history",
  all_queues: "All queues",
  load_more: "Load more",
  no_matches: "No matches for this filter.",
  victory: "Victory",
  defeat: "Defeat",
  remake: "Remake",
  kda: "KDA",
  kill_participation: "Kill participation",
  cs: "CS",
  per_min: "/min",
  damage: "Damage",
  gold: "Gold",
  vision: "Vision",
  blue_team: "Blue team",
  red_team: "Red team",
  details: "Details",
  towers: "Towers",
  dragons: "Dragons",
  barons: "Barons",
  multikill_2: "Double",
  multikill_3: "Triple",
  multikill_4: "Quadra",
  multikill_5: "Penta",

  queue_solo: "Ranked Solo/Duo",
  queue_flex: "Ranked Flex",
  queue_draft: "Normal Draft",
  queue_blind: "Normal Blind",
  queue_quickplay: "Quickplay",
  queue_aram: "ARAM",
  queue_clash: "Clash",
  queue_urf: "URF",
  queue_arena: "Arena",

  leaderboard_title: "Challenger leaderboard",
  leaderboard_sub: "Top players on {s}, live from Riot.",
  player: "Player",
  games: "Games",
  hot_streak: "Hot streak",

  tierlist_title: "Tier list",
  tierlist_sub: "Strong picks by role. An editorial list, not Riot statistics.",
  tierlist_based_on: "For patch {v}",

  err_no_key: "No Riot API key is configured on the server.",
  err_bad_key: "The Riot API key is invalid or expired.",
  err_not_found: "No such player on this server.",
  err_rate_limited: "We hit Riot's rate limit. Try again in a few seconds.",
  err_unavailable: "Riot's servers can't be reached right now.",
  try_again: "Try again",
  back_home: "Back to home",

  just_now: "just now",
  minutes_ago: "{n}m ago",
  hours_ago: "{n}h ago",
  days_ago: "{n}d ago",
  months_ago: "{n}mo ago",

  footer_note: "lustlol isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.",
};

export const dictionaries: Record<Locale, Dictionary> = { tr, en };

export type DictKey = keyof Dictionary;

export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function timeAgo(dict: Dictionary, ts: number, now = Date.now()): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return dict.just_now;
  if (min < 60) return format(dict.minutes_ago, { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return format(dict.hours_ago, { n: h });
  const d = Math.floor(h / 24);
  if (d < 30) return format(dict.days_ago, { n: d });
  return format(dict.months_ago, { n: Math.floor(d / 30) });
}
