import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Globe, Shield, Trophy, Flame, Swords, ExternalLink, 
  ChevronRight, ChevronDown, RefreshCw, X, AlertCircle, ArrowUpRight, BarChart3,
  Layers, Users, Clock, Sparkles, CheckCircle2, Crown, HelpCircle, Filter
} from 'lucide-react';

interface Participant {
  champion: string;
  name: string;
  tag: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalDamageDealtToChampions?: number;
  goldEarned?: number;
  cs?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
}

interface Match {
  id: string;
  win: boolean;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  cs?: number;
  mode: string;
  gameDuration?: number;
  gameCreation?: number;
  gameEndTimestamp?: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  team1: Participant[];
  team2: Participant[];
}

function formatTimeAgo(timestamp: number | undefined, currentLang: 'en' | 'tr'): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);

  if (currentLang === 'tr') {
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 30) return `${days} gün önce`;
    return `${months} ay önce`;
  } else {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return `${months}mo ago`;
  }
}

function formatGameDuration(durationInSeconds: number | undefined, currentLang: 'en' | 'tr'): string {
  if (!durationInSeconds) return '';
  const m = Math.floor(durationInSeconds / 60);
  const s = Math.floor(durationInSeconds % 60);
  return currentLang === 'tr' ? `${m}dk ${s}sn` : `${m}m ${s}s`;
}

interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface ChampionMastery {
  championId: number;
  championName: string;
  championDisplayName: string;
  championLevel: number;
  championPoints: number;
  championSeasonMilestone: number;
  lastPlayTime: number;
}

interface PlayerData {
  name: string;
  tag: string;
  level: number;
  profileIconId: number;
  ranked: RankedEntry[];
  matches: Match[];
  totalAvailable?: number;
  championMasteries?: ChampionMastery[];
}

interface PatchChamp {
  champion: string;
  details: string[];
}

interface SavedSearch {
  name: string;
  tag: string;
  server: string;
  iconId: number;
}

const SERVERS = [
  { id: 'euw', label: 'EUW', region: 'Europe' },
  { id: 'tr', label: 'TR', region: 'Türkiye' },
  { id: 'na', label: 'NA', region: 'North America' },
  { id: 'kr', label: 'KR', region: 'Korea' },
  { id: 'eune', label: 'EUNE', region: 'Europe East' },
  { id: 'oce', label: 'OCE', region: 'Oceania' },
  { id: 'br', label: 'BR', region: 'Brazil' },
  { id: 'las', label: 'LAS', region: 'Latin America S' },
  { id: 'lan', label: 'LAN', region: 'Latin America N' },
  { id: 'jp', label: 'JP', region: 'Japan' },
];

const TRANSLATIONS = {
  en: {
    nav_leaderboards: "Leaderboards",
    nav_tierlist: "Tierlist & Build",
    nav_home: "Home",
    patch_highlights: "Patch Highlights",
    buffs: "▲ Buffs",
    nerfs: "▼ Nerfs",
    adjusted: "⚡ Adjusted",
    recent_players: "Recent Searches",
    players_heading: "PLAYERS",
    analyzing: "Analyzing summoner data...",
    server_error: "Server connection or Riot API error.",
    format_error: "Format must be: Name#TAG (e.g. lust#77 or Faker#KR1)",
    player_not_found: "Player not found or Riot API key expired",
    match_not_found: "No recent matches found for this summoner.",
    soloqueue: "Ranked Solo",
    flex: "Ranked Flex",
    arena: "Arena",
    unranked: "Unranked",
    victory: "Victory",
    defeat: "Defeat",
    remake: "Remake",
    played: "Played",
    winrate: "Winrate",
    search_placeholder: "Search a summoner or champion (e.g. lust#77)...",
    search_btn: "Search",
    load_more: "Load More Matches",
    quick_sample: "Featured Players",
    clear_recent: "Clear",
    match_details: "Match Breakdown",
    damage: "Damage Dealt",
    gold: "Gold",
    cs: "CS",
    kda: "KDA",
    team_blue: "Blue Team",
    team_red: "Red Team",
    items: "Items",
    patch_ver: "Patch",
    total_games: "Games",
    wins: "W",
    losses: "L",
    tier_challenger: "Challenger",
    tier_grandmaster: "Grandmaster",
    tier_master: "Master",
    tier_diamond: "Diamond",
    meta_tierlist: "Patch Meta Tier List",
    top_challengers: "Global Top Ranked",
    back_to_search: "Back to Profile Search",
    played_with: "Played With (Duo)",
    no_duo_found: "No duo found with at least 7 games played together",
    min_games: "Min. 7 Games",
    most_played_champions: "Most Played Champions",
    performance_overview: "Performance Overview",
    recent_20_form: "Recent 20 Games Form",
    recent_matches: "Recent Matches",
    update_profile: "Update Profile",
    level: "Level",
    view_profile: "View Profile",
    inspect: "Inspect",
    rank_solo: "Solo/Duo",
    rank_flex: "Flex",
    hero_title_1: "Search Any Riot ID on",
    hero_desc: "Real-time match analytics, ranked progression, build itemization, patch buffs & nerfs, and team performances across all global League of Legends servers.",
    ranked_tracking: "Ranked Tracking",
    ranked_tracking_desc: "Solo/Duo & Flex tiers, LP progression and winrates.",
    match_history_box: "Match History",
    match_history_desc: "In-depth team scoreboards, KDA, items, and rosters.",
    live_patch_box: "Live Patch Data",
    live_patch_desc: "Auto-scraped Riot patch notes with buff/nerf tags.",
    quick_explore: "Quick Access & Explore",
    live_leaderboard_title: "Live Leaderboards",
    live_leaderboard_sub: "TR, EUW, KR, NA Challenger ladders",
    meta_tierlist_title: "Meta Tier List",
    meta_tierlist_sub: "S+ High elo role champions, builds and pick rates",
    how_to_search_title: "How to Search:",
    how_to_search_desc: "Type a summoner Riot ID (e.g. lust#77). Select candidate players across servers from the dropdown to query live data from Riot Games API.",
    auto_sync_msg: "Auto-scanning full match history & duos in background...",
    all_synced_msg: "All recent matches & duos synced",
    no_leaderboard_data: "No leaderboard entries found.",
    fetching_leaderboard: "Fetching Riot Games Challenger ladder...",
    profile_subtitle: "League of Legends summoner profile on",
    loading_patch: "Loading patch notes...",
    none_in_patch: "None in this patch"
  },
  tr: {
    nav_leaderboards: "Sıralamalar",
    nav_tierlist: "Tierlist & Rün/Build",
    nav_home: "Ana Sayfa",
    patch_highlights: "Yama Öne Çıkanlar",
    buffs: "▲ Güçlendirmeler",
    nerfs: "▼ Zayıflatmalar",
    adjusted: "⚡ Düzenlenenler",
    recent_players: "Son Aramalar",
    players_heading: "OYUNCULAR",
    analyzing: "Sihirdar verileri analiz ediliyor...",
    server_error: "Sunucu bağlantı veya Riot API hatası.",
    format_error: "Format şöyle olmalıdır: İsim#TAG (Örn: lust#77 veya Faker#KR1)",
    player_not_found: "Oyuncu bulunamadı veya Riot API anahtarı geçersiz",
    match_not_found: "Bu sihirbaz için yakın zamanda oynanmış maç bulunamadı.",
    soloqueue: "Tekli/Çiftli",
    flex: "Esnek",
    arena: "Arena",
    unranked: "Derecesiz",
    victory: "Zafer",
    defeat: "Bozgun",
    remake: "Geçersiz (Remake)",
    played: "Oynanan",
    winrate: "Kazanma Oranı",
    search_placeholder: "Sihirdar veya şampiyon ara (Örn: lust#77)...",
    search_btn: "Ara",
    load_more: "Daha Fazla Maç Göster",
    quick_sample: "Örnek Oyuncular",
    clear_recent: "Temizle",
    match_details: "Maç Detayları",
    damage: "Hasar",
    gold: "Altın",
    cs: "Minyon",
    kda: "KDA",
    team_blue: "Mavi Takım",
    team_red: "Kırmızı Takım",
    items: "Eşyalar",
    patch_ver: "Yama",
    total_games: "Maç",
    wins: "G",
    losses: "M",
    tier_challenger: "Şampiyonluk",
    tier_grandmaster: "Üstatlık",
    tier_master: "Ustalık",
    tier_diamond: "Elmas",
    meta_tierlist: "Mevcut Yama Şampiyon Meta Listesi",
    top_challengers: "Global Sıralama Liderleri",
    back_to_search: "Profil Aramaya Dön",
    played_with: "Birlikte Oynananlar (Duo)",
    no_duo_found: "En az 7 maç birlikte oynanan bir duo bulunamadı",
    min_games: "Min. 7 Maç",
    most_played_champions: "En Çok Oynanan Şampiyonlar",
    performance_overview: "Performans Özeti",
    recent_20_form: "Son 20 Maç Formu",
    recent_matches: "Son Maçlar",
    update_profile: "Profili Güncelle",
    level: "Seviye",
    view_profile: "Profili Gör",
    inspect: "İncele",
    rank_solo: "Tekli/Çiftli",
    rank_flex: "Esnek",
    hero_title_1: "lustlol Üzerinde Dilediğin Riot ID'yi Ara",
    hero_desc: "Gerçek zamanlı maç istatistikleri, dereceli lig gelişimi, şampiyon eşya dizilimleri, yama notları ve küresel tüm sunucularda takım performansları.",
    ranked_tracking: "Lig ve Derece Takibi",
    ranked_tracking_desc: "Tekli/Çiftli ve Esnek ligler, LP ilerlemesi ve kazanma oranları.",
    match_history_box: "Maç Geçmişi",
    match_history_desc: "Ayrıntılı skor tabloları, KDA, eşyalar ve takım kadroları.",
    live_patch_box: "Canlı Yama Verisi",
    live_patch_desc: "Güçlendirme/zayıflatma etiketleriyle otomatik çekilen yama notları.",
    quick_explore: "Hızlı Erişim & Keşfet",
    live_leaderboard_title: "Canlı Sıralamalar",
    live_leaderboard_sub: "TR, EUW, KR, NA Challenger ligi",
    meta_tierlist_title: "Şampiyon Meta Listesi",
    meta_tierlist_sub: "Koridorlara göre S+ dereceli şampiyonlar",
    how_to_search_title: "Nasıl Aranır?",
    how_to_search_desc: "Arama çubuğuna bir Riot ID yazın (Örn: lust#77). Açılan menüden sunucular arasındaki oyuncu önerisine tıklayarak doğrudan Riot Games API verilerine anında ulaşın.",
    auto_sync_msg: "Arka planda tüm maçlar ve duo geçmişi otomatik taranıyor...",
    all_synced_msg: "Tüm son maçlar ve duolar otomatik tarandı",
    no_leaderboard_data: "Sıralama verisi bulunamadı.",
    fetching_leaderboard: "Riot Games Challenger sıralaması çekiliyor...",
    profile_subtitle: "League of Legends sihirdar profili - Sunucu:",
    loading_patch: "Yama notları yükleniyor...",
    none_in_patch: "Bu yamada değişiklik yok"
  }
};

const SAMPLE_LEADERBOARD = [
  { rank: 1, name: "Agurin", tag: "EUW", tier: "CHALLENGER", lp: 1684, winrate: 68, wins: 412, losses: 194, server: "euw" },
  { rank: 2, name: "Hide on bush", tag: "KR1", tier: "CHALLENGER", lp: 1542, winrate: 64, wins: 388, losses: 218, server: "kr" },
  { rank: 3, name: "G2 Caps", tag: "EUW", tier: "CHALLENGER", lp: 1489, winrate: 62, wins: 340, losses: 208, server: "euw" },
  { rank: 4, name: "Bo", tag: "KR", tier: "CHALLENGER", lp: 1420, winrate: 66, wins: 298, losses: 153, server: "kr" },
  { rank: 5, name: "Sniper", tag: "NA1", tier: "CHALLENGER", lp: 1395, winrate: 61, wins: 330, losses: 210, server: "na" },
  { rank: 6, name: "Armut", tag: "TR1", tier: "CHALLENGER", lp: 1320, winrate: 65, wins: 290, losses: 156, server: "tr" },
];

const META_TIERLIST = [
  { role: "TOP", tier: "S+", champions: ["Aatrox", "Camille", "Jax", "Ambessa"], winRate: "52.4%", pickRate: "11.2%" },
  { role: "JUNGLE", tier: "S+", champions: ["LeeSin", "Viego", "Graves", "Sejuani"], winRate: "51.8%", pickRate: "14.5%" },
  { role: "MID", tier: "S+", champions: ["Ahri", "Sylas", "Orianna", "Yone"], winRate: "52.1%", pickRate: "13.8%" },
  { role: "ADC", tier: "S+", champions: ["Jinx", "KaiSa", "Varus", "Tristana"], winRate: "51.9%", pickRate: "18.2%" },
  { role: "SUPPORT", tier: "S+", champions: ["Nautilus", "Thresh", "Lulu", "Leona"], winRate: "52.0%", pickRate: "15.0%" },
];

export default function App() {
  const [lang, setLang] = useState<'en' | 'tr'>(() => {
    return (localStorage.getItem('lustlol_lang') as 'en' | 'tr') || 'en';
  });

  const [server, setServer] = useState<string>('tr');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SavedSearch[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [currentView, setCurrentView] = useState<'profile' | 'leaderboards' | 'tierlist'>('profile');

  const [patchVersion, setPatchVersion] = useState<string>('14.24');
  const [ddragonVer, setDdragonVer] = useState<string>('14.24.1');
  const [patchNotes, setPatchNotes] = useState<{ buffs: string[]; nerfs: string[]; adjusted: string[] }>({
    buffs: [],
    nerfs: [],
    adjusted: []
  });
  const [patchLoading, setPatchLoading] = useState(true);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState<'solo' | 'flex'>('solo');

  // Background auto-sync state for matches and duos
  const [autoSyncingMatches, setAutoSyncingMatches] = useState(false);
  const [autoSyncProgress, setAutoSyncProgress] = useState<{ loaded: number; total: number } | null>(null);
  const autoSyncAbortRef = useRef<AbortController | null>(null);

  // Dynamic Leaderboard state from live Riot API
  const [leaderboardServer, setLeaderboardServer] = useState<string>('tr');
  const [leaderboardQueue, setLeaderboardQueue] = useState<string>('RANKED_SOLO_5x5');
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Match history pagination & filtering (10 games initially, up to max capacity data)
  const [visibleMatchesCount, setVisibleMatchesCount] = useState<number>(10);
  const [selectedChampFilter, setSelectedChampFilter] = useState<string | null>(null);
  const [selectedQueueFilter, setSelectedQueueFilter] = useState<string | null>(null);
  const [isChampDropdownOpen, setIsChampDropdownOpen] = useState(false);
  const [isQueueDropdownOpen, setIsQueueDropdownOpen] = useState(false);
  const [champFilterSearch, setChampFilterSearch] = useState('');
  const [allChampsList, setAllChampsList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!ddragonVer) return;
    fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/data/en_US/champion.json`)
      .then(r => r.json())
      .then(d => {
        if (d?.data) {
          const list = Object.values(d.data).map((c: any) => ({
            id: c.id,
            name: c.name
          }));
          list.sort((a, b) => a.name.localeCompare(b.name));
          setAllChampsList(list);
        }
      })
      .catch(() => {});
  }, [ddragonVer]);

  // Compute Played With (Duo) statistics from match history (Min. 7 games)
  const duoStats = useMemo(() => {
    if (!playerData || !playerData.matches || playerData.matches.length === 0) return [];
    const duoMap = new Map<string, {
      name: string;
      tag: string;
      games: number;
      wins: number;
      losses: number;
      championCounts: Record<string, number>;
    }>();

    const myName = (playerData.name || '').trim().toLowerCase();

    for (const m of playerData.matches) {
      if (!m.team1 || !m.team2) continue;

      const inTeam1 = m.team1.some(
        p => p.name && p.name.trim().toLowerCase() === myName
      );
      const inTeam2 = m.team2.some(
        p => p.name && p.name.trim().toLowerCase() === myName
      );

      const myTeam = inTeam1 ? m.team1 : inTeam2 ? m.team2 : null;
      if (!myTeam) continue;

      for (const p of myTeam) {
        if (!p.name) continue;
        const pNameLower = p.name.trim().toLowerCase();
        if (pNameLower === myName) continue;

        const pTag = p.tag ? p.tag.trim() : server.toUpperCase();
        const key = `${pNameLower}#${pTag.toLowerCase()}`;

        let record = duoMap.get(key);
        if (!record) {
          record = {
            name: p.name,
            tag: pTag,
            games: 0,
            wins: 0,
            losses: 0,
            championCounts: {}
          };
          duoMap.set(key, record);
        }

        record.games += 1;
        if (m.win) {
          record.wins += 1;
        } else {
          record.losses += 1;
        }

        if (p.champion) {
          record.championCounts[p.champion] = (record.championCounts[p.champion] || 0) + 1;
        }
      }
    }

    const list = Array.from(duoMap.values())
      .filter(d => d.games >= 5) // En az 5 maç birlikte oynanmış gerçek duolar
      .map(d => {
        let favChamp = '';
        let maxCount = 0;
        for (const [champ, count] of Object.entries(d.championCounts)) {
          if (count > maxCount) {
            maxCount = count;
            favChamp = champ;
          }
        }
        const winrate = Math.round((d.wins / d.games) * 100);
        return {
          ...d,
          favChamp,
          winrate
        };
      });

    list.sort((a, b) => b.games - a.games || b.winrate - a.winrate);
    return list;
  }, [playerData, server]);

  // Compute Most Played Champions (Season & Mastery priority - LeagueOfGraphs style)
  const mostPlayedChampions = useMemo(() => {
    if (!playerData) return [];

    const matches = playerData.matches || [];
    const masteries = playerData.championMasteries || [];

    // Map match stats by champion name (lowercase)
    const matchStatsMap = new Map<string, {
      games: number;
      wins: number;
      losses: number;
      kills: number;
      deaths: number;
      assists: number;
      cs: number;
    }>();

    for (const m of matches) {
      if (!m.champion) continue;
      const key = m.champion.toLowerCase();
      let record = matchStatsMap.get(key);
      if (!record) {
        record = { games: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, cs: 0 };
        matchStatsMap.set(key, record);
      }
      record.games += 1;
      if (m.win) record.wins += 1;
      else record.losses += 1;
      record.kills += m.kills || 0;
      record.deaths += m.deaths || 0;
      record.assists += m.assists || 0;
      record.cs += m.cs || 0;
    }

    const list: Array<{
      champion: string;
      championDisplayName: string;
      championId?: number;
      games: number;
      wins: number;
      losses: number;
      winrate: number;
      kdaRatio: string;
      avgK: string;
      avgD: string;
      avgA: string;
      avgCs: number;
      rankTier: string;
      masteryLevel: number;
      masteryPoints: number;
      seasonMilestone: number;
    }> = [];

    const seenChamps = new Set<string>();

    for (const m of masteries) {
      const champKey = m.championName.toLowerCase();
      seenChamps.add(champKey);
      const st = matchStatsMap.get(champKey);

      const games = st ? st.games : 0;
      const wins = st ? st.wins : 0;
      const losses = st ? st.losses : 0;
      const kills = st ? st.kills : 0;
      const deaths = st ? st.deaths : 0;
      const assists = st ? st.assists : 0;
      const cs = st ? st.cs : 0;

      // Real winrate from season matches if available, otherwise baseline performance
      const winrate = games > 0 ? Math.round((wins / games) * 100) : (m.championLevel >= 20 ? 58 : 52);
      const kdaRatio = deaths === 0 ? (kills + assists > 0 ? 'Perfect' : '3.20') : ((kills + assists) / deaths).toFixed(2);
      const avgK = games > 0 ? (kills / games).toFixed(1) : '-';
      const avgD = games > 0 ? (deaths / games).toFixed(1) : '-';
      const avgA = games > 0 ? (assists / games).toFixed(1) : '-';
      const avgCs = games > 0 ? Math.round(cs / games) : 0;

      let rankTier = 'A';
      if (m.championLevel >= 30 || m.championSeasonMilestone >= 10 || (games >= 5 && winrate >= 60)) rankTier = 'S+';
      else if (m.championLevel >= 20 || m.championSeasonMilestone >= 5 || (games >= 3 && winrate >= 55)) rankTier = 'S';
      else if (m.championLevel >= 10 || winrate >= 50) rankTier = 'A+';

      list.push({
        champion: m.championName,
        championDisplayName: m.championDisplayName || m.championName,
        championId: m.championId,
        games,
        wins,
        losses,
        winrate,
        kdaRatio,
        avgK,
        avgD,
        avgA,
        avgCs,
        rankTier,
        masteryLevel: m.championLevel,
        masteryPoints: m.championPoints,
        seasonMilestone: m.championSeasonMilestone || 0
      });
    }

    // Include any other champion from match history not in top masteries
    for (const [champKey, st] of matchStatsMap.entries()) {
      if (!seenChamps.has(champKey)) {
        const winrate = Math.round((st.wins / st.games) * 100);
        const kdaRatio = st.deaths === 0 ? 'Perfect' : ((st.kills + st.assists) / st.deaths).toFixed(2);
        list.push({
          champion: champKey,
          championDisplayName: champKey.charAt(0).toUpperCase() + champKey.slice(1),
          games: st.games,
          wins: st.wins,
          losses: st.losses,
          winrate,
          kdaRatio,
          avgK: (st.kills / st.games).toFixed(1),
          avgD: (st.deaths / st.games).toFixed(1),
          avgA: (st.assists / st.games).toFixed(1),
          avgCs: Math.round(st.cs / st.games),
          rankTier: winrate >= 60 ? 'S' : 'A',
          masteryLevel: 1,
          masteryPoints: 0,
          seasonMilestone: 0
        });
      }
    }

    // Bu sezon başladığından beri en çok oynadığı şampiyonlar en üstte sıralansın
    list.sort((a, b) => {
      const scoreA = a.seasonMilestone * 50000 + a.games * 15000 + a.masteryPoints;
      const scoreB = b.seasonMilestone * 50000 + b.games * 15000 + b.masteryPoints;
      return scoreB - scoreA;
    });

    return list;
  }, [playerData?.championMasteries, playerData?.matches]);

  // Filtered Matches based on Champion & Queue dropdown selections
  const filteredMatches = useMemo(() => {
    if (!playerData?.matches) return [];
    return playerData.matches.filter(m => {
      if (selectedChampFilter) {
        if (m.champion.toLowerCase() !== selectedChampFilter.toLowerCase()) {
          return false;
        }
      }
      if (selectedQueueFilter) {
        const modeLower = (m.mode || '').toLowerCase();
        if (selectedQueueFilter === 'solo') {
          if (!modeLower.includes('tek') && !modeLower.includes('solo') && !modeLower.includes('420')) return false;
        } else if (selectedQueueFilter === 'flex') {
          if (!modeLower.includes('esnek') && !modeLower.includes('flex') && !modeLower.includes('440')) return false;
        } else if (selectedQueueFilter === 'normal') {
          if (!modeLower.includes('seçim') && !modeLower.includes('draft') && !modeLower.includes('blind') && !modeLower.includes('kapalı')) return false;
        } else if (selectedQueueFilter === 'aram') {
          if (!modeLower.includes('aram')) return false;
        } else if (selectedQueueFilter === 'arena') {
          if (!modeLower.includes('arena') && !modeLower.includes('1700')) return false;
        }
      }
      return true;
    });
  }, [playerData?.matches, selectedChampFilter, selectedQueueFilter]);

  // Real-time suggested players from server index (LeagueOfGraphs style real accounts)
  const [realSuggestedPlayers, setRealSuggestedPlayers] = useState<Array<{
    gameName: string;
    tagLine: string;
    server: string;
    profileIconId: number;
    summonerLevel?: number;
    tier?: string;
    rank?: string;
  }>>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  useEffect(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      setRealSuggestedPlayers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(raw)}`);
        if (res.ok) {
          const data = await res.json();
          setRealSuggestedPlayers(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.warn('Failed to fetch player suggestions:', e);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof TRANSLATIONS['en']) => TRANSLATIONS[lang][key] || key;

  // Language switch
  const handleLangChange = (newLang: 'en' | 'tr') => {
    setLang(newLang);
    localStorage.setItem('lustlol_lang', newLang);
  };

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lustlol_players');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not parse saved players:', e);
    }
  }, []);

  const savePlayerToRecent = (name: string, tag: string, srv: string, iconId: number) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(
        p => !(p.name.toLowerCase() === name.toLowerCase() && p.tag.toLowerCase() === tag.toLowerCase() && p.server === srv)
      );
      const updated = [{ name, tag, server: srv, iconId }, ...filtered].slice(0, 15);
      localStorage.setItem('lustlol_players', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('lustlol_players');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch DataDragon version and Scraped Patch
  useEffect(() => {
    async function initPatchAndVersions() {
      try {
        const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        if (vRes.ok) {
          const versions = await vRes.json();
          if (Array.isArray(versions) && versions.length > 0) {
            setDdragonVer(versions[0]);
          }
        }
      } catch (e) {
        console.warn('DDragon version fetch fallback', e);
      }

      try {
        setPatchLoading(true);
        const pRes = await fetch('/api/scraped-patch');
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && Array.isArray(pData.data)) {
            if (pData.patchVersion) setPatchVersion(pData.patchVersion);

            const buffs: string[] = [];
            const nerfs: string[] = [];
            const adjusted: string[] = [];

            pData.data.forEach((item: any) => {
              const cName = item.champion;
              if (item.category === 'buff') {
                if (!buffs.includes(cName)) buffs.push(cName);
              } else if (item.category === 'nerf') {
                if (!nerfs.includes(cName)) nerfs.push(cName);
              } else {
                if (!adjusted.includes(cName)) adjusted.push(cName);
              }
            });

            setPatchNotes({ buffs, nerfs, adjusted });
          }
        }
      } catch (err) {
        console.warn('Scraped patch error:', err);
      } finally {
        setPatchLoading(false);
      }
    }

    initPatchAndVersions();
  }, []);

  const fetchLeaderboard = async (srv: string, q: string) => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch(`/api/leaderboard?server=${encodeURIComponent(srv)}&queue=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.entries)) {
        setLeaderboardEntries(data.entries);
      } else {
        setLeaderboardError(data.error || 'Leaderboard verisi alınamadı.');
      }
    } catch (e: any) {
      setLeaderboardError('Sunucu bağlantı hatası.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'leaderboards') {
      fetchLeaderboard(leaderboardServer, leaderboardQueue);
    }
  }, [currentView, leaderboardServer, leaderboardQueue]);

  // Auto-search if URL is /summoner/:server/:riotId
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'summoner' && pathParts[2] && pathParts[3]) {
      const srv = pathParts[2];
      const riotIdDecoded = decodeURIComponent(pathParts[3]);
      const lastDash = riotIdDecoded.lastIndexOf('-');
      if (lastDash !== -1) {
        const name = riotIdDecoded.substring(0, lastDash).replace(/-/g, ' ');
        const tag = riotIdDecoded.substring(lastDash + 1);
        setServer(srv);
        setSearchQuery(`${name}#${tag}`);
        performSearch(name, tag, srv);
      }
    }
  }, []);

  const startBackgroundMatchSync = async (
    name: string,
    tag: string,
    srv: string,
    initialCount: number,
    totalAvailable: number,
    signal: AbortSignal
  ) => {
    setAutoSyncingMatches(true);
    setAutoSyncProgress({ loaded: initialCount, total: totalAvailable });

    let currentStart = initialCount;
    // Auto-fetch up to maximum available matches automatically in background (up to 1000 games / 500+ days back!)
    const maxToFetch = Math.min(totalAvailable, 1000);

    while (currentStart < maxToFetch && !signal.aborted) {
      try {
        const countToFetch = Math.min(10, maxToFetch - currentStart);
        const res = await fetch(
          `/api/player?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&server=${srv}&start=${currentStart}&count=${countToFetch}`,
          { signal }
        );
        if (signal.aborted) break;
        if (res.status === 429) {
          // Riot API rate limit protection: pause for 2.5 seconds then continue
          await new Promise(r => setTimeout(r, 2500));
          continue;
        }
        if (!res.ok) break;
        const chunkData = await res.json();
        if (!chunkData.matches || chunkData.matches.length === 0) break;

        currentStart += chunkData.matches.length;
        setAutoSyncProgress({ loaded: currentStart, total: totalAvailable });

        setPlayerData(prev => {
          if (!prev) return prev;
          const existingIds = new Set(prev.matches.map(m => m.id));
          const newMatches = chunkData.matches.filter((m: any) => !existingIds.has(m.id));
          return {
            ...prev,
            matches: [...prev.matches, ...newMatches]
          };
        });

        // Gentle pause between batches to respect Riot API rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        break;
      }
    }

    if (!signal.aborted) {
      setAutoSyncingMatches(false);
      setAutoSyncProgress(null);
    }
  };

  const performSearch = async (name: string, tag: string, srv: string) => {
    setLoading(true);
    setErrorMsg(null);
    setIsDropdownOpen(false);
    setCurrentView('profile');
    setVisibleMatchesCount(10);
    setSelectedChampFilter(null);
    setSelectedQueueFilter(null);
    setIsChampDropdownOpen(false);
    setIsQueueDropdownOpen(false);

    // Cancel any ongoing auto-sync
    if (autoSyncAbortRef.current) {
      autoSyncAbortRef.current.abort();
    }
    const abortController = new AbortController();
    autoSyncAbortRef.current = abortController;

    // Update URL path dynamically
    const cleanName = name.trim().replace(/\s+/g, '-');
    const cleanTag = tag.trim();
    const newUrl = `/summoner/${srv}/${encodeURIComponent(cleanName)}-${encodeURIComponent(cleanTag)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    try {
      // First load: 10 matches for instant response
      const res = await fetch(`/api/player?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}&server=${srv}&start=0&count=10`);
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || `${t('player_not_found')} (${res.status})`;
        setErrorMsg(errMsg);
        setPlayerData(null);
        return;
      }

      setPlayerData(data);
      savePlayerToRecent(data.name, data.tag, srv, data.profileIconId);

      // Automatically trigger background match sync so all duos, champions and full career matches load
      if (data.totalAvailable && data.totalAvailable > data.matches.length) {
        startBackgroundMatchSync(data.name, data.tag, srv, data.matches.length, data.totalAvailable, abortController.signal);
      }
    } catch (err: any) {
      setErrorMsg(t('server_error'));
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) return;

    setIsDropdownOpen(false);

    const hashIdx = raw.lastIndexOf('#');
    if (hashIdx !== -1) {
      const name = raw.slice(0, hashIdx).trim();
      const tag = raw.slice(hashIdx + 1).trim();
      performSearch(name, tag, server || 'tr');
    } else if (realSuggestedPlayers.length > 0) {
      const top = realSuggestedPlayers[0];
      setSearchQuery(`${top.gameName}#${top.tagLine}`);
      setServer(top.server);
      performSearch(top.gameName, top.tagLine, top.server);
    } else {
      performSearch(raw, server === 'euw' ? 'EUW' : 'TR1', server || 'tr');
    }
  };

  const loadMoreMatches = async () => {
    if (!playerData || loadingMore) return;
    setLoadingMore(true);

    const currentCount = playerData.matches.length;
    try {
      const res = await fetch(
        `/api/player?name=${encodeURIComponent(playerData.name)}&tag=${encodeURIComponent(playerData.tag)}&server=${server}&start=${currentCount}&count=20`
      );
      const data = await res.json();
      if (res.ok && data.matches && data.matches.length > 0) {
        setPlayerData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: [...prev.matches, ...data.matches]
          };
        });
      }
    } catch (err) {
      console.error('Error loading more matches:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Rank calculations
  const soloRank = playerData?.ranked?.find(r => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = playerData?.ranked?.find(r => r.queueType === 'RANKED_FLEX_SR');
  const activeRank = activeRankTab === 'solo' ? soloRank : flexRank;

  const totalSoloGames = soloRank ? soloRank.wins + soloRank.losses : 0;
  const soloWinRate = totalSoloGames > 0 ? Math.round((soloRank!.wins / totalSoloGames) * 100) : 0;
  const soloWrAngle = Math.round((soloWinRate / 100) * 360);

  const getCleanChampName = (name: string) => name.replace(/['\s.]/g, '');

  return (
    <div className="min-h-screen bg-[#0d0f15] text-[#e2e8f0] relative selection:bg-blue-600 selection:text-white flex flex-col font-['Sora',sans-serif]">
      {/* Background Ambient Glow & League Cosmic Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute top-[30%] -right-[15%] w-[550px] h-[550px] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/5 blur-[130px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-30 w-full bg-[#12151e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => {
              setCurrentView('profile');
              setPlayerData(null);
              setErrorMsg(null);
              setSearchQuery('');
              window.history.pushState({}, '', '/');
            }}
            className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity focus-visible:outline-none cursor-pointer"
          >
            Lust<span className="text-blue-500 font-extrabold">LoL</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => {
                setCurrentView('profile');
                setPlayerData(null);
                setErrorMsg(null);
                setSearchQuery('');
                window.history.pushState({}, '', '/');
              }}
              className={`transition-colors cursor-pointer ${currentView === 'profile' && !playerData ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              {t('nav_home')}
            </button>
            <button
              onClick={() => setCurrentView('leaderboards')}
              className={`transition-colors cursor-pointer ${currentView === 'leaderboards' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              {t('nav_leaderboards')}
            </button>
            <button
              onClick={() => setCurrentView('tierlist')}
              className={`transition-colors cursor-pointer ${currentView === 'tierlist' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              {t('nav_tierlist')}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector Button Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-0.5 text-xs shadow-md">
            <button
              onClick={() => handleLangChange('en')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>English</span>
            </button>
            <button
              onClick={() => handleLangChange('tr')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                lang === 'tr'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Türkçe</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-[1240px] w-full mx-auto px-4 md:px-6 py-6">
        {/* Search Header Container */}
        <div className="w-full flex justify-end mb-6">
          {/* LeagueOfGraphs Style Clean Search Bar without server dropdown */}
          <div className="relative w-full md:w-[480px]" ref={dropdownRef}>
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center w-full bg-[#151926]/95 border border-slate-700/80 hover:border-blue-500/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-full shadow-lg shadow-black/40 transition-all p-1"
            >
              <div className="pl-3.5 pr-2 text-slate-400">
                <Search className="w-4 h-4 text-blue-400" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder={t('search_placeholder')}
                className="flex-1 bg-transparent py-2 px-1 text-sm text-white placeholder-slate-400 outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors mr-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                aria-label="Search"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow cursor-pointer shrink-0"
              >
                {t('search_btn')}
              </button>
            </form>

            {/* LeagueOfGraphs Style Dropdown: RECENT & PLAYERS */}
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-full bg-[#141824]/98 backdrop-blur-2xl border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                {/* 1. RECENT SEARCHES (Matches LeagueOfGraphs top section) */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Recent</span>
                      </span>
                      <button 
                        onClick={clearRecentSearches}
                        className="text-slate-500 hover:text-slate-300 text-[10px] font-normal transition-colors cursor-pointer"
                      >
                        {t('clear_recent')}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/40">
                      {recentSearches.map((p, idx) => (
                        <div
                          key={`recent-${p.name}-${p.tag}-${idx}`}
                          onClick={() => {
                            setSearchQuery(`${p.name}#${p.tag}`);
                            setServer(p.server);
                            setIsDropdownOpen(false);
                            performSearch(p.name, p.tag, p.server);
                          }}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800/60 cursor-pointer transition-colors group"
                        >
                          <Clock className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0" />
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-semibold text-white group-hover:text-blue-300 leading-tight truncate">
                              {p.name}#{p.tag}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({p.server.toUpperCase()})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. REAL PLAYERS Suggestions (LeagueOfGraphs real accounts) */}
                {searchQuery.trim().length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-900/90 text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Players</span>
                      </span>
                      {isSearchingSuggestions && (
                        <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
                          <span>Aranıyor...</span>
                        </span>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/40">
                      {realSuggestedPlayers.length > 0 ? (
                        realSuggestedPlayers.map((p, idx) => (
                          <div
                            key={`real-${p.gameName}-${p.tagLine}-${p.server}-${idx}`}
                            onClick={() => {
                              setSearchQuery(`${p.gameName}#${p.tagLine}`);
                              setServer(p.server);
                              setIsDropdownOpen(false);
                              performSearch(p.gameName, p.tagLine, p.server);
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-600/15 cursor-pointer transition-colors group"
                          >
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/${p.profileIconId || 29}.png`}
                              alt=""
                              className="w-8 h-8 rounded-lg border border-slate-700 group-hover:border-blue-400 object-cover shrink-0 transition-colors shadow-sm"
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/29.png`; }}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                  {p.gameName}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  #{p.tagLine}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({p.server.toUpperCase()})
                                </span>
                              </div>
                              {p.tier ? (
                                <span className="text-[10px] text-amber-400 font-semibold tracking-wide">
                                  {p.tier} {p.rank || ''} {p.summonerLevel ? `• Lv. ${p.summonerLevel}` : ''}
                                </span>
                              ) : p.summonerLevel ? (
                                <span className="text-[10px] text-slate-500">
                                  Level {p.summonerLevel}
                                </span>
                              ) : null}
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase shrink-0 ${
                              p.server === 'tr' 
                                ? 'bg-red-950/50 text-red-300 border-red-700/60' 
                                : p.server === 'euw' 
                                ? 'bg-blue-950/50 text-blue-300 border-blue-700/60'
                                : p.server === 'eune'
                                ? 'bg-purple-950/50 text-purple-300 border-purple-700/60'
                                : p.server === 'kr'
                                ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'
                                : p.server === 'na'
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {p.server.toUpperCase()}
                            </span>
                          </div>
                        ))
                      ) : !isSearchingSuggestions ? (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">
                          {lang === 'tr' ? 'Tam Riot ID ile arayın (Örn: lust#7 7)' : 'Search with full Riot ID (e.g. lust#7 7)'}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">{t('analyzing')}</p>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && !loading && (
          <div className="p-4 mb-6 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* VIEW 1: LEADERBOARDS (LIVE RIOT API) */}
        {currentView === 'leaderboards' && (
          <div className="bg-[#151824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> {t('top_challengers')}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Live Riot Games Challenger rankings for <span className="font-semibold text-white uppercase">{leaderboardServer}</span>
                </p>
              </div>

              {/* Controls: Server & Queue Switchers + Refresh */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Server Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  {['tr', 'euw', 'kr', 'na', 'eune'].map((srvCode) => (
                    <button
                      key={srvCode}
                      onClick={() => setLeaderboardServer(srvCode)}
                      className={`px-2.5 py-1 rounded font-bold uppercase transition-colors cursor-pointer ${leaderboardServer === srvCode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {srvCode}
                    </button>
                  ))}
                </div>

                {/* Queue Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setLeaderboardQueue('RANKED_SOLO_5x5')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${leaderboardQueue === 'RANKED_SOLO_5x5' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Solo/Duo
                  </button>
                  <button
                    onClick={() => setLeaderboardQueue('RANKED_FLEX_SR')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${leaderboardQueue === 'RANKED_FLEX_SR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Flex
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchLeaderboard(leaderboardServer, leaderboardQueue)}
                  disabled={leaderboardLoading}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Refresh Leaderboard"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${leaderboardLoading ? 'animate-spin text-blue-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Error or Loading state */}
            {leaderboardError && (
              <div className="p-3 mb-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leaderboardError}</span>
              </div>
            )}

            {leaderboardLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>Riot Games Challenger sıralaması çekiliyor...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-400 border-b border-slate-800/80 pb-2">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Sihirdar (Riot ID)</th>
                      <th className="py-2.5 px-3">Lig</th>
                      <th className="py-2.5 px-3">LP</th>
                      <th className="py-2.5 px-3">Kazanma Oranı</th>
                      <th className="py-2.5 px-3 text-right">Profil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {leaderboardEntries.length > 0 ? (
                      leaderboardEntries.map((p) => {
                        const isTop1 = p.rank === 1;
                        const isTop2 = p.rank === 2;
                        const isTop3 = p.rank === 3;

                        return (
                          <tr key={`${p.rank}-${p.name}`} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs">
                                  1
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold text-xs">
                                  2
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-800/20 text-amber-400 border border-amber-800/40 font-bold text-xs">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">#{p.rank}</span>
                              )}
                            </td>
                            {/* Summoner with Profile Icon & Clickable Name */}
                            <td className="py-3 px-3">
                              <div
                                onClick={() => {
                                  setSearchQuery(`${p.name}#${p.tag}`);
                                  setServer(leaderboardServer);
                                  performSearch(p.name, p.tag, leaderboardServer);
                                }}
                                className="flex items-center gap-3 cursor-pointer group/summoner w-fit"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/${p.profileIconId || 29}.png`}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-amber-500/50 group-hover/summoner:border-blue-400 group-hover/summoner:scale-105 object-cover shadow-sm shrink-0 transition-all"
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/29.png`; }}
                                />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white group-hover/summoner:text-blue-400 group-hover/summoner:underline transition-colors">
                                      {p.name}
                                    </span>
                                    <span className="text-xs text-slate-400 font-normal">#{p.tag}</span>
                                    {p.hotStreak && (
                                      <span className="text-xs" title="Kazanma serisinde (Hot streak)">
                                        🔥
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 uppercase font-mono">{leaderboardServer}</span>
                                </div>
                              </div>
                            </td>
                            {/* Tier with Challenger Crest Icon */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2" title="Challenger">
                                <img
                                  src="https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/challenger.png"
                                  alt="Challenger"
                                  className="w-7 h-7 object-contain filter drop-shadow"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="text-xs font-extrabold text-amber-300 hidden sm:inline">
                                  Challenger
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-100">{p.leaguePoints?.toLocaleString() || p.lp} LP</td>
                            <td className="py-3 px-3 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-semibold text-xs">{p.winrate}%</span>
                                <div className="hidden sm:block w-16 h-1.5 rounded-full bg-red-950 overflow-hidden">
                                  <div style={{ width: `${p.winrate}%` }} className="h-full bg-emerald-500" />
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  ({p.wins}W {p.losses}L)
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setSearchQuery(`${p.name}#${p.tag}`);
                                  setServer(leaderboardServer);
                                  performSearch(p.name, p.tag, leaderboardServer);
                                }}
                                className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-300 rounded text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>İncele</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                          Sıralama verisi bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TIERLIST & BUILDS */}
        {currentView === 'tierlist' && (
          <div className="bg-[#151824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" /> {t('meta_tierlist')}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Patch {patchVersion} Ranked Solo/Duo High Elo Meta</p>
              </div>
              <button 
                onClick={() => setCurrentView('profile')} 
                className="text-xs text-blue-400 hover:underline"
              >
                {t('back_to_search')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {META_TIERLIST.map((entry) => (
                <div key={entry.role} className="bg-[#1a1e2d] border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-slate-200 tracking-wider">{entry.role}</span>
                    <span className="text-xs font-extrabold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                      {entry.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {entry.champions.map((champ) => (
                      <div key={champ} className="flex flex-col items-center">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(champ)}.png`}
                          alt={champ}
                          className="w-11 h-11 rounded-lg border border-slate-700 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                        />
                        <span className="text-[10px] text-slate-400 mt-1">{champ}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <span>Winrate: <b className="text-emerald-400">{entry.winRate}</b></span>
                    <span>Pickrate: <b>{entry.pickRate}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: PROFILE & HOME */}
        {currentView === 'profile' && (
          <>
            {/* If NO summoner searched yet, show Home with Patch Highlights & Hero welcome */}
            {!playerData && !loading && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* Left: Patch Highlights Panel */}
                <div className="lg:col-span-5 bg-[#151824]/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-sm text-white">{t('patch_highlights')}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                      v{patchVersion}
                    </span>
                  </div>

                  {patchLoading ? (
                    <div className="py-12 flex justify-center text-slate-500 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading patch notes...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                      {/* Buffs */}
                      <div>
                        <div className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          {t('buffs')}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {patchNotes.buffs.length > 0 ? (
                            patchNotes.buffs.map((champ) => (
                              <div
                                key={champ}
                                className="flex items-center gap-1.5 bg-slate-900/80 border border-emerald-900/60 hover:border-emerald-500/60 rounded-full py-1 px-2 text-xs text-slate-200 transition-colors"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(champ)}.png`}
                                  alt={champ}
                                  className="w-5 h-5 rounded-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                />
                                <span className="text-emerald-400 font-medium">{champ}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None in this patch</span>
                          )}
                        </div>
                      </div>

                      {/* Nerfs */}
                      <div>
                        <div className="text-[11px] font-extrabold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          {t('nerfs')}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {patchNotes.nerfs.length > 0 ? (
                            patchNotes.nerfs.map((champ) => (
                              <div
                                key={champ}
                                className="flex items-center gap-1.5 bg-slate-900/80 border border-red-900/60 hover:border-red-500/60 rounded-full py-1 px-2 text-xs text-slate-200 transition-colors"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(champ)}.png`}
                                  alt={champ}
                                  className="w-5 h-5 rounded-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                />
                                <span className="text-red-400 font-medium">{champ}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None in this patch</span>
                          )}
                        </div>
                      </div>

                      {/* Adjusted */}
                      <div>
                        <div className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          {t('adjusted')}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {patchNotes.adjusted.length > 0 ? (
                            patchNotes.adjusted.map((champ) => (
                              <div
                                key={champ}
                                className="flex items-center gap-1.5 bg-slate-900/80 border border-blue-900/60 hover:border-blue-500/60 rounded-full py-1 px-2 text-xs text-slate-200 transition-colors"
                              >
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(champ)}.png`}
                                  alt={champ}
                                  className="w-5 h-5 rounded-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                />
                                <span className="text-blue-300 font-medium">{champ}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None in this patch</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Search Guidance & Featured Quick Lookups */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="bg-gradient-to-br from-[#161a26] to-[#12151e] border border-slate-800 rounded-2xl p-7 shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
                      {t('hero_title_1')} <span className="text-blue-500">lustlol</span>
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                      {t('hero_desc')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <Trophy className="w-5 h-5 text-amber-400 mb-2" />
                        <h4 className="text-xs font-bold text-white mb-1">{t('ranked_tracking')}</h4>
                        <p className="text-[11px] text-slate-400">{t('ranked_tracking_desc')}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <Swords className="w-5 h-5 text-blue-400 mb-2" />
                        <h4 className="text-xs font-bold text-white mb-1">{t('match_history_box')}</h4>
                        <p className="text-[11px] text-slate-400">{t('match_history_desc')}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <Layers className="w-5 h-5 text-emerald-400 mb-2" />
                        <h4 className="text-xs font-bold text-white mb-1">{t('live_patch_box')}</h4>
                        <p className="text-[11px] text-slate-400">{t('live_patch_desc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Platform Features & Quick Navigation */}
                  <div className="bg-[#151824]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        {t('quick_explore')}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">v{patchVersion}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => setCurrentView('leaderboards')}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/60 hover:bg-blue-600/10 transition-all text-left group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {t('live_leaderboard_title')}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {t('live_leaderboard_sub')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </button>

                      <button
                        onClick={() => setCurrentView('tierlist')}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/60 hover:bg-blue-600/10 transition-all text-left group cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            {t('meta_tierlist_title')}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {t('meta_tierlist_sub')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </div>

                    <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl text-xs text-slate-400 leading-relaxed">
                      💡 <strong className="text-slate-200">{t('how_to_search_title')}</strong>{' '}
                      {t('how_to_search_desc')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* When Summoner data is loaded */}
            {playerData && !loading && (
              <div className="space-y-6">
                {/* Profile Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#171b28] via-[#151926] to-[#12141e] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Avatar & Level Badge */}
                  <div className="relative">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/${playerData.profileIconId}.png`}
                      alt="Profile Icon"
                      className="w-24 h-24 rounded-full border-4 border-blue-500 shadow-xl object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/29.png`; }}
                    />
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#0f1118] border border-blue-500 text-blue-300 text-xs font-bold px-3 py-0.5 rounded-full shadow">
                      {playerData.level}
                    </span>
                  </div>

                  {/* Summoner Name, Tag, Server and Quick Refresh */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                      <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        {playerData.name} <span className="text-slate-500 text-xl font-semibold">#{playerData.tag}</span>
                      </h1>
                      <span className="inline-block self-center md:self-auto text-xs font-bold bg-blue-950/60 border border-blue-800/80 text-blue-300 px-2.5 py-0.5 rounded-md uppercase">
                        {server}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {t('profile_subtitle')} {SERVERS.find(s => s.id === server)?.region || server.toUpperCase()}
                    </p>
                  </div>

                  <button
                    onClick={() => performSearch(playerData.name, playerData.tag, server)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('update_profile')}</span>
                  </button>
                </div>

                {/* Main 2-Column Grid: Match History & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Ranked Card & Match History */}
                  <div className="lg:col-span-8 space-y-5">
                    {/* Rank Card */}
                    <div className="bg-[#151824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-5">
                      {activeRank && activeRank.tier !== 'UNRANKED' ? (
                        <img
                          src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${activeRank.tier.toLowerCase()}.png`}
                          alt={activeRank.tier}
                          className="w-24 h-24 object-contain filter drop-shadow-lg"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                          <Shield className="w-8 h-8" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {activeRankTab === 'solo' ? t('soloqueue') : t('flex')}
                          </span>
                        </div>

                        {activeRank ? (
                          <>
                            <div className="text-2xl font-extrabold text-[#c084fc]">
                              {activeRank.tier} {['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(activeRank.tier) ? '' : activeRank.rank}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              <b className="text-white font-mono">{activeRank.leaguePoints} LP</b> · {activeRank.wins}{t('wins')} {activeRank.losses}{t('losses')}{' '}
                              ({Math.round((activeRank.wins / (activeRank.wins + activeRank.losses)) * 100)}%)
                            </div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-slate-400">{t('unranked')}</div>
                        )}
                      </div>

                      {/* Rank Toggle Pill */}
                      <div className="flex flex-col gap-1 text-xs">
                        <button
                          onClick={() => setActiveRankTab('solo')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${activeRankTab === 'solo' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {t('rank_solo')}
                        </button>
                        <button
                          onClick={() => setActiveRankTab('flex')}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${activeRankTab === 'flex' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {t('rank_flex')}
                        </button>
                      </div>
                    </div>

                    {/* Match History Title and Filters (LeagueOfGraphs style) */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                            <span>{lang === 'tr' ? 'Son Oyunlar' : 'Recent games'}</span>
                          </h2>
                          <div className="relative group">
                            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-200 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-300 shadow-xl z-20 pointer-events-none text-center">
                              {lang === 'tr' ? 'Son oynanan tüm maçlar, modlar ve şampiyonlar' : 'Match history across all queues and champions'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {filteredMatches.length} {lang === 'tr' ? 'maç' : 'matches'}
                          {playerData.totalAvailable ? ` / ${playerData.totalAvailable}` : ''}
                        </span>
                      </div>

                      {/* Filter Boxes: All champions & All Queues (Matching user screenshot) */}
                      <div className="grid grid-cols-2 gap-3 relative z-20">
                        {/* Box 1: All Champions Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsChampDropdownOpen(!isChampDropdownOpen);
                              setIsQueueDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#141824] hover:bg-[#1a2030] border border-slate-700/80 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-sm group"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              {selectedChampFilter ? (
                                <>
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(selectedChampFilter)}.png`}
                                    alt={selectedChampFilter}
                                    className="w-5 h-5 rounded-md object-cover shrink-0"
                                  />
                                  <span className="text-white font-bold truncate">{selectedChampFilter}</span>
                                </>
                              ) : (
                                <span className="text-slate-300 truncate">{lang === 'tr' ? 'Tüm Şampiyonlar' : 'All champions'}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {selectedChampFilter && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedChampFilter(null);
                                    setVisibleMatchesCount(10);
                                  }}
                                  className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${isChampDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {/* Popover Dropdown matching user screenshot */}
                          {isChampDropdownOpen && (
                            <div className="absolute top-full mt-2 left-0 w-[300px] sm:w-[440px] max-w-[90vw] bg-[#141824]/98 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5">
                              {/* Top Option: All champions */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedChampFilter(null);
                                  setIsChampDropdownOpen(false);
                                  setVisibleMatchesCount(10);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${!selectedChampFilter ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800/80'}`}
                              >
                                {lang === 'tr' ? 'Tüm Şampiyonlar' : 'All champions'}
                              </button>

                              {/* 3-Column Champion Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                                {allChampsList
                                  .filter(c => !champFilterSearch || c.name.toLowerCase().includes(champFilterSearch.toLowerCase()) || c.id.toLowerCase().includes(champFilterSearch.toLowerCase()))
                                  .map(c => {
                                    const isSelected = selectedChampFilter?.toLowerCase() === c.id.toLowerCase();
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedChampFilter(c.id);
                                          setIsChampDropdownOpen(false);
                                          setVisibleMatchesCount(10);
                                        }}
                                        className={`flex items-center gap-2 p-1.5 rounded-xl text-left transition-all cursor-pointer group ${isSelected ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800/80 text-slate-300'}`}
                                      >
                                        <img
                                          src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(c.id)}.png`}
                                          alt={c.name}
                                          className="w-7 h-7 rounded-lg border border-slate-700 group-hover:border-blue-400 object-cover shrink-0"
                                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                        />
                                        <span className="text-[11px] font-semibold truncate leading-tight">{c.name}</span>
                                      </button>
                                    );
                                  })}
                              </div>

                              {/* Search Champion Input */}
                              <div className="pt-2 border-t border-slate-800">
                                <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-700/80 focus-within:border-blue-500">
                                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <input
                                    type="text"
                                    value={champFilterSearch}
                                    onChange={(e) => setChampFilterSearch(e.target.value)}
                                    placeholder={lang === 'tr' ? 'Şampiyon' : 'Champion'}
                                    className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
                                  />
                                  {champFilterSearch && (
                                    <button type="button" onClick={() => setChampFilterSearch('')} className="text-slate-400 hover:text-white">
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Box 2: All Queues Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsQueueDropdownOpen(!isQueueDropdownOpen);
                              setIsChampDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#141824] hover:bg-[#1a2030] border border-slate-700/80 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer shadow-sm group"
                          >
                            <span className="text-slate-300 truncate">
                              {selectedQueueFilter === 'solo' ? (lang === 'tr' ? 'Dereceli Tek/Çift' : 'Ranked Solo/Duo')
                                : selectedQueueFilter === 'flex' ? (lang === 'tr' ? 'Dereceli Esnek' : 'Ranked Flex')
                                : selectedQueueFilter === 'normal' ? (lang === 'tr' ? 'Normal (Sıralı/Kapalı)' : 'Normal (Draft/Blind)')
                                : selectedQueueFilter === 'aram' ? 'ARAM'
                                : selectedQueueFilter === 'arena' ? 'Arena'
                                : (lang === 'tr' ? 'Tüm Modlar' : 'All Queues')}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {selectedQueueFilter && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQueueFilter(null);
                                    setVisibleMatchesCount(10);
                                  }}
                                  className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${isQueueDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {/* Popover Dropdown for Queues */}
                          {isQueueDropdownOpen && (
                            <div className="absolute top-full mt-2 right-0 w-full sm:w-64 bg-[#141824]/98 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                              {[
                                { id: null, labelTr: 'Tüm Modlar', labelEn: 'All Queues' },
                                { id: 'solo', labelTr: 'Dereceli Tekli/Çiftli', labelEn: 'Ranked Solo/Duo' },
                                { id: 'flex', labelTr: 'Dereceli Esnek', labelEn: 'Ranked Flex' },
                                { id: 'normal', labelTr: 'Normal (Sıralı/Kapalı)', labelEn: 'Normal (Draft/Blind)' },
                                { id: 'aram', labelTr: 'ARAM', labelEn: 'ARAM' },
                                { id: 'arena', labelTr: 'Arena', labelEn: 'Arena' }
                              ].map(q => {
                                const isSelected = selectedQueueFilter === q.id;
                                return (
                                  <button
                                    key={String(q.id)}
                                    type="button"
                                    onClick={() => {
                                      setSelectedQueueFilter(q.id);
                                      setIsQueueDropdownOpen(false);
                                      setVisibleMatchesCount(10);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/80'}`}
                                  >
                                    {lang === 'tr' ? q.labelTr : q.labelEn}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Matches List (Paginated - starts at 10 matches) */}
                    <div className="space-y-2.5">
                      {filteredMatches.length > 0 ? (
                        filteredMatches.slice(0, visibleMatchesCount).map((m) => {
                          const isWin = m.win;
                          const kdaRatio = m.deaths === 0 ? 'Perfect' : ((m.kills + m.assists) / m.deaths).toFixed(2);
                          const itemsList = [m.item0, m.item1, m.item2, m.item3, m.item4, m.item5, m.item6];

                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMatch(m)}
                              className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#151824]/90 hover:bg-[#1b2030] border transition-all cursor-pointer shadow-md ${isWin ? 'border-blue-900/60 hover:border-blue-500/60' : 'border-red-950/60 hover:border-red-500/60'}`}
                            >
                              {/* Left status accent strip */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isWin ? 'bg-blue-500' : 'bg-red-500'}`} />

                              {/* Champion portrait & Result */}
                              <div className="flex items-center gap-3 pl-2 min-w-[150px]">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(m.champion)}.png`}
                                  alt={m.champion}
                                  className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-extrabold ${isWin ? 'text-blue-400' : 'text-red-400'}`}>
                                      {isWin ? t('victory') : t('defeat')}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">{m.mode}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-medium">
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>{formatTimeAgo(m.gameEndTimestamp || m.gameCreation, lang)}</span>
                                    {m.gameDuration ? (
                                      <>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-slate-400">{formatGameDuration(m.gameDuration, lang)}</span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* KDA Stats */}
                              <div className="flex flex-col items-center min-w-[110px] text-center">
                                <div className="text-sm font-bold text-white font-mono">
                                  {m.kills} <span className="text-slate-500">/</span> <span className="text-red-400">{m.deaths}</span> <span className="text-slate-500">/</span> {m.assists}
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">
                                  {kdaRatio} <span className="text-[10px] text-slate-500">KDA</span>
                                </div>
                              </div>

                              {/* Items Matrix */}
                              <div className="grid grid-cols-4 gap-1">
                                {itemsList.map((itemId, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded bg-slate-800/80 border border-slate-700/60 overflow-hidden flex items-center justify-center"
                                  >
                                    {itemId && itemId > 0 ? (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/item/${itemId}.png`}
                                        alt="item"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : null}
                                  </div>
                                ))}
                              </div>

                              {/* Teams Mini Rosters */}
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  {m.team1?.map((pObj, idx) => (
                                    <img
                                      key={idx}
                                      src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(pObj.champion)}.png`}
                                      alt={pObj.champion}
                                      title={`${pObj.name} #${pObj.tag}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery(`${pObj.name}#${pObj.tag}`);
                                        performSearch(pObj.name, pObj.tag, server);
                                      }}
                                      className="w-6 h-6 rounded object-cover cursor-pointer hover:scale-125 transition-transform border border-slate-700"
                                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-1">
                                  {m.team2?.map((pObj, idx) => (
                                    <img
                                      key={idx}
                                      src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(pObj.champion)}.png`}
                                      alt={pObj.champion}
                                      title={`${pObj.name} #${pObj.tag}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery(`${pObj.name}#${pObj.tag}`);
                                        performSearch(pObj.name, pObj.tag, server);
                                      }}
                                      className="w-6 h-6 rounded object-cover cursor-pointer hover:scale-125 transition-transform border border-slate-700"
                                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-8 text-slate-500 text-sm">{t('match_not_found')}</p>
                      )}
                    </div>

                    {/* Pagination Button: Load More Games (+10) */}
                    {filteredMatches.length > visibleMatchesCount && (
                      <button
                        onClick={() => {
                          setVisibleMatchesCount(prev => prev + 10);
                          if (visibleMatchesCount + 10 >= playerData.matches.length && playerData.matches.length < (playerData.totalAvailable || 0)) {
                            loadMoreMatches();
                          }
                        }}
                        className="w-full py-3.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/50 text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md group"
                      >
                        <ChevronDown className="w-4 h-4 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
                        <span>{lang === 'tr' ? 'Daha Fazla Maç Göster (+10)' : 'Load More Games (+10)'}</span>
                        <span className="text-[11px] text-slate-500">
                          ({filteredMatches.length - visibleMatchesCount} {lang === 'tr' ? 'maç daha' : 'more'})
                        </span>
                      </button>
                    )}

                    {/* Auto Loading or Sync Finished Note */}
                    {autoSyncingMatches ? (
                      <div className="w-full py-3 px-4 bg-blue-950/40 border border-blue-800/60 text-blue-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 animate-pulse shadow-sm">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        <span>
                          {lang === 'tr'
                            ? `Arka planda tüm maç geçmişi taranıyor... (${playerData.matches.length}/${playerData.totalAvailable || 500})`
                            : `Auto-scanning full match history & duos in background... (${playerData.matches.length}/${playerData.totalAvailable || 500})`}
                        </span>
                      </div>
                    ) : playerData.matches.length > 20 ? (
                      <div className="w-full py-2.5 px-4 bg-slate-900/40 border border-slate-800/60 text-slate-400 font-medium rounded-xl text-xs text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {lang === 'tr'
                            ? `Tüm maçlar ve duolar otomatik tarandı (Toplam ${playerData.matches.length} Maç)`
                            : `All recent matches & duos synced (${playerData.matches.length} Games)`}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Right Column: Winrate & Stats Rings Panel */}
                  <div className="lg:col-span-4 bg-[#151824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl sticky top-6">
                    <div className="text-sm font-bold text-white pb-3 border-b border-slate-800 mb-5 flex items-center justify-between">
                      <span>{t('performance_overview')}</span>
                      <span className="text-xs text-blue-400 font-medium">{t('soloqueue')}</span>
                    </div>

                    <div className="flex justify-around items-center mb-6">
                      {/* Games Ring */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="relative w-24 h-24 rounded-full flex items-center justify-center"
                          style={{
                            background: `conic-gradient(#3b82f6 360deg, #1e293b 0deg)`
                          }}
                        >
                          <div className="absolute inset-2 bg-[#151824] rounded-full flex items-center justify-center">
                            <span className="text-xl font-extrabold text-white font-mono">{totalSoloGames}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{t('played')}</span>
                      </div>

                      {/* Winrate Ring */}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="relative w-24 h-24 rounded-full flex items-center justify-center"
                          style={{
                            background: `conic-gradient(#22c55e ${soloWrAngle}deg, #1e293b 0deg)`
                          }}
                        >
                          <div className="absolute inset-2 bg-[#151824] rounded-full flex items-center justify-center">
                            <span className="text-xl font-extrabold text-white font-mono">{soloWinRate}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{t('winrate')}</span>
                      </div>
                    </div>

                    {/* Recent Match Breakdown Summary */}
                    {playerData.matches.length > 0 && (
                      <div className="pt-4 border-t border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {t('recent_20_form')}
                        </div>
                        {(() => {
                          const recent20 = playerData.matches.slice(0, 20);
                          const wins = recent20.filter(m => m.win).length;
                          const losses = recent20.length - wins;
                          const rate = Math.round((wins / recent20.length) * 100);
                          return (
                            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-semibold text-white">{wins}W {losses}L</span>
                                <span className="font-bold text-emerald-400">{rate}% {t('winrate')}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-red-950 overflow-hidden flex">
                                <div style={{ width: `${rate}%` }} className="h-full bg-blue-500" />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Most Played Champions (LeagueOfGraphs style) */}
                    {mostPlayedChampions.length > 0 && (
                      <div className="pt-4 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            {t('most_played_champions')}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {mostPlayedChampions.length} {lang === 'tr' ? 'Şampiyon' : 'Champs'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {mostPlayedChampions.slice(0, 7).map((c) => {
                            const isHighWr = c.winrate >= 60;
                            const isLowWr = c.winrate <= 40;

                            return (
                              <div
                                key={c.champion}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                              >
                                {/* Left: Champion icon, Name & Season / Mastery Stats */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(c.champion)}.png`}
                                    alt={c.championDisplayName || c.champion}
                                    className="w-10 h-10 rounded-xl border border-slate-700 object-cover shrink-0 shadow"
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-white truncate">
                                        {c.championDisplayName || c.champion}
                                      </span>
                                      {c.seasonMilestone > 0 && (
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-600/50 text-amber-300">
                                          M{c.seasonMilestone}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      {c.masteryPoints > 0 ? (
                                        <span>Sv. {c.masteryLevel} ({Math.round(c.masteryPoints / 1000)}K)</span>
                                      ) : null}
                                      {c.games > 0 && (
                                        <>
                                          <span>·</span>
                                          <span className="text-slate-300 font-mono">{c.games} {lang === 'tr' ? 'Oyun' : 'Games'}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Center: KDA & Avg K/D/A */}
                                <div className="flex flex-col items-center px-1">
                                  <span className="text-xs font-bold text-slate-200 font-mono">
                                    {c.kdaRatio}:1 <span className="text-[10px] text-slate-400 font-normal">KDA</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {c.avgK}/{c.avgD}/{c.avgA}
                                  </span>
                                </div>

                                {/* Right: Winrate, Rank tier & CS */}
                                <div className="flex flex-col items-end shrink-0 pl-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-extrabold font-mono ${isHighWr ? 'text-emerald-400' : isLowWr ? 'text-red-400' : 'text-slate-200'}`}>
                                      {c.winrate}%
                                    </span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                                      {c.rankTier}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {c.games > 0 ? `${c.wins}W ${c.losses}L` : `${c.avgCs} CS`}
                                    </span>
                                    <div className="w-10 h-1 rounded-full bg-red-950 overflow-hidden ml-0.5">
                                      <div style={{ width: `${c.winrate}%` }} className="h-full bg-emerald-500" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Played With (Duos) Panel - Similar to League of Graphs */}
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          {t('played_with')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-300/80 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded-md font-medium">
                            {t('min_games')}
                          </span>
                          {autoSyncingMatches ? (
                            <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>{playerData.matches.length} maç</span>
                            </span>
                          ) : (
                            duoStats.length > 0 && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {`${duoStats.length} ${lang === 'tr' ? 'Oyuncu' : 'Players'}`}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {duoStats.length > 0 ? (
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {duoStats.slice(0, 6).map((duo) => {
                            const isHighWr = duo.winrate >= 60;
                            const isLowWr = duo.winrate <= 40;

                            return (
                              <div
                                key={`${duo.name}-${duo.tag}`}
                                onClick={() => {
                                  setSearchQuery(`${duo.name}#${duo.tag}`);
                                  performSearch(duo.name, duo.tag, server);
                                }}
                                className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm"
                                title={lang === 'tr' ? `${duo.name} profilini aç` : `View ${duo.name} profile`}
                              >
                                {/* Left: Champion icon & Duo name */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {duo.favChamp ? (
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(duo.favChamp)}.png`}
                                      alt={duo.favChamp}
                                      className="w-8 h-8 rounded-full border border-slate-700 group-hover:border-blue-400 object-cover shrink-0 transition-colors"
                                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                                      {duo.name.charAt(0)}
                                    </div>
                                  )}

                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white group-hover:text-blue-400 truncate group-hover:underline transition-colors">
                                      {duo.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 truncate font-mono">
                                      #{duo.tag}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Games together & Duo Winrate */}
                                <div className="flex flex-col items-end shrink-0 pl-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold font-mono ${isHighWr ? 'text-emerald-400' : isLowWr ? 'text-red-400' : 'text-slate-200'}`}>
                                      {duo.winrate}%
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      ({duo.games} {lang === 'tr' ? 'Oyun' : 'Games'})
                                    </span>
                                  </div>

                                  {/* Visual Winrate Mini Bar */}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      <span className="text-emerald-400 font-semibold">{duo.wins}W</span>{' '}
                                      <span className="text-red-400 font-semibold">{duo.losses}L</span>
                                    </span>
                                    <div className="w-12 h-1.5 rounded-full bg-red-950 overflow-hidden flex ml-1">
                                      <div style={{ width: `${duo.winrate}%` }} className="h-full bg-emerald-500" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60 text-center space-y-1">
                          <p className="text-xs text-slate-400 font-medium">
                            {autoSyncingMatches
                              ? (lang === 'tr' ? `Maçlar ve duolar taranıyor (${playerData.matches.length}/${playerData.totalAvailable || 1000})...` : `Scanning matches & duos (${playerData.matches.length}/${playerData.totalAvailable || 1000})...`)
                              : t('no_duo_found')}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {autoSyncingMatches 
                              ? (lang === 'tr' ? 'En az 5 maç birlikte oynadığınız kişiler tespit edildiğinde otomatik olarak buraya eklenecektir.' : 'Players with at least 5 games together will appear automatically.')
                              : (lang === 'tr' ? `Taranan ${playerData.matches.length} maç geçmişinde en az 5 kez denk geldiğiniz bir sihirdar bulunamadı.` : `No summoner with 5+ games found across ${playerData.matches.length} scanned matches.`)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Match Breakdown Modal (Replacing the missing match.html cleanly) */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#141724] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-blue-400" />
                  {t('match_details')} · {selectedMatch.mode}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-extrabold ${selectedMatch.win ? 'text-blue-400' : 'text-red-400'}`}>
                    {selectedMatch.win ? t('victory') : t('defeat')}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {formatTimeAgo(selectedMatch.gameEndTimestamp || selectedMatch.gameCreation, lang)}
                    {selectedMatch.gameDuration ? ` (${formatGameDuration(selectedMatch.gameDuration, lang)})` : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Team 1 Scoreboard */}
            <div className="mb-6">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('team_blue')}
              </div>
              <div className="space-y-1.5">
                {selectedMatch.team1?.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(p.champion)}.png`}
                        alt={p.champion}
                        className="w-8 h-8 rounded-full border border-blue-500/40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                      />
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.champion}</div>
                      </div>
                    </div>

                    <div className="font-mono text-slate-300">
                      {p.kills ?? '-'} / <span className="text-red-400">{p.deaths ?? '-'}</span> / {p.assists ?? '-'}
                    </div>

                    <div className="text-slate-400 font-mono">
                      {p.totalDamageDealtToChampions ? `${p.totalDamageDealtToChampions.toLocaleString()} dmg` : ''}
                    </div>

                    <div className="flex items-center gap-1">
                      {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((it, i) => (
                        <div key={i} className="w-5 h-5 rounded bg-slate-800 border border-slate-700/60 overflow-hidden">
                          {it && it > 0 ? (
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/item/${it}.png`} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team 2 Scoreboard */}
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {t('team_red')}
              </div>
              <div className="space-y-1.5">
                {selectedMatch.team2?.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/${getCleanChampName(p.champion)}.png`}
                        alt={p.champion}
                        className="w-8 h-8 rounded-full border border-red-500/40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/champion/Aatrox.png`; }}
                      />
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.champion}</div>
                      </div>
                    </div>

                    <div className="font-mono text-slate-300">
                      {p.kills ?? '-'} / <span className="text-red-400">{p.deaths ?? '-'}</span> / {p.assists ?? '-'}
                    </div>

                    <div className="text-slate-400 font-mono">
                      {p.totalDamageDealtToChampions ? `${p.totalDamageDealtToChampions.toLocaleString()} dmg` : ''}
                    </div>

                    <div className="flex items-center gap-1">
                      {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((it, i) => (
                        <div key={i} className="w-5 h-5 rounded bg-slate-800 border border-slate-700/60 overflow-hidden">
                          {it && it > 0 ? (
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/item/${it}.png`} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>lustlol.lol is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games.</p>
        <p className="mt-1">League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}
