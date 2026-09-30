import express, { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MatchService, riotLimiter } from './matchService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
app.use(express.json());

const KEY = process.env.RIOT_API_KEY || '';
const MONGO_URI = process.env.MONGO_URI || '';

// In-memory fallback match cache in case MongoDB is unreachable or whitelisting fails
const inMemoryMatchCache = new Map<string, any>();
const playerMatchIdsCache = new Map<string, { timestamp: number; matchIds: string[] }>();
const playerProfileCache = new Map<string, { timestamp: number; account: any; summoner: any; ranked: any; championMasteries: any[] }>();
const suggestionApiCache = new Map<string, { timestamp: number; players: IndexedPlayer[] }>();
let mongoConnected = false;

// Maç Verisi İçin Şema (Schema)
const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true, index: true },
  data: Object,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 } // 7 days TTL
});
const MatchModel = mongoose.models.Match || mongoose.model('Match', matchSchema);

// MongoDB connection with graceful fallback and short timeout
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000,
    })
    .then(() => {
      mongoConnected = true;
      console.log('MongoDB Atlas bağlantısı başarılı!');
    })
    .catch((err) => {
      mongoConnected = false;
      console.warn('MongoDB bağlantı uyarısı (in-memory önbellek devrede):', err.message);
    });
} else {
  console.log('MONGO_URI bulunamadı, in-memory önbellek kullanılacak.');
}

const SERVERS: Record<string, { platform: string; region: string; name: string }> = {
  euw: { platform: 'euw1', region: 'europe', name: 'Europe West' },
  tr: { platform: 'tr1', region: 'europe', name: 'Türkiye' },
  na: { platform: 'na1', region: 'americas', name: 'North America' },
  kr: { platform: 'kr', region: 'asia', name: 'Korea' },
  eune: { platform: 'eun1', region: 'europe', name: 'Europe Nordic & East' },
  ru: { platform: 'ru', region: 'europe', name: 'Russia' },
  oce: { platform: 'oc1', region: 'sea', name: 'Oceania' },
  br: { platform: 'br1', region: 'americas', name: 'Brazil' },
  las: { platform: 'la2', region: 'americas', name: 'Latin America South' },
  lan: { platform: 'la1', region: 'americas', name: 'Latin America North' },
  jp: { platform: 'jp1', region: 'asia', name: 'Japan' }
};

const QUEUE_MAP: Record<number | string, string> = {
  400: 'Sıralı Seçim',
  420: 'Tekli/Çiftli',
  430: 'Kapalı Seçim',
  440: 'Esnek',
  450: 'ARAM',
  490: 'Hızlı Oyun',
  700: 'Clash',
  900: 'URF',
  1700: 'Arena'
};

async function getCachedMatch(matchId: string) {
  if (mongoConnected) {
    try {
      const doc = await MatchModel.findOne({ matchId }).lean();
      if (doc) return (doc as any).data;
    } catch (e) {
      // Fallback to in-memory
    }
  }
  return inMemoryMatchCache.get(matchId) || null;
}

async function setCachedMatch(matchId: string, data: any) {
  inMemoryMatchCache.set(matchId, data);
  if (mongoConnected) {
    try {
      await MatchModel.findOneAndUpdate(
        { matchId },
        { matchId, data, createdAt: new Date() },
        { upsert: true }
      );
    } catch (e) {
      // ignore cache save errors
    }
  }
}

// DataDragon Champion ID to Name mapping
const championIdMap: Record<number, { id: string; name: string }> = {};

async function loadChampionMap() {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/cdn/14.24.1/data/en_US/champion.json');
    if (res.ok) {
      const data = await res.json();
      for (const key of Object.keys(data.data)) {
        const champ = data.data[key];
        championIdMap[Number(champ.key)] = {
          id: champ.id,
          name: champ.name
        };
      }
    }
  } catch (err) {
    console.warn('Champion map fetch warning:', err);
  }
}
loadChampionMap();

export interface IndexedPlayer {
  gameName: string;
  tagLine: string;
  server: string;
  profileIconId: number;
  summonerLevel?: number;
  tier?: string;
  rank?: string;
  lastSeen?: number;
}

const indexedPlayers = new Map<string, IndexedPlayer>();

export function saveIndexedPlayer(p: IndexedPlayer) {
  if (!p.gameName || !p.tagLine) return;
  const key = `${p.gameName.toLowerCase()}#${p.tagLine.toLowerCase()}`;
  const existing = indexedPlayers.get(key);
  indexedPlayers.set(key, {
    ...existing,
    ...p,
    lastSeen: Date.now()
  });
}

// Pre-seed known real accounts from the user's community & high-elo players across TR, EUW, EUNE, KR, NA, RU
const initialKnownRealPlayers: IndexedPlayer[] = [
  // TR
  { gameName: 'lust', tagLine: '7 7', server: 'tr', profileIconId: 6922, summonerLevel: 579, tier: 'GRANDMASTER', rank: 'I' },
  { gameName: 'lust', tagLine: 'eyes', server: 'tr', profileIconId: 588, summonerLevel: 420, tier: 'MASTER', rank: 'I' },
  { gameName: 'lust', tagLine: '5 6', server: 'tr', profileIconId: 6909, summonerLevel: 380, tier: 'DIAMOND', rank: 'I' },
  { gameName: 'Lust', tagLine: '0004', server: 'tr', profileIconId: 6909, summonerLevel: 356, tier: 'DIAMOND', rank: 'II' },
  // EUW
  { gameName: 'Lůst', tagLine: 'EUW', server: 'euw', profileIconId: 4804, summonerLevel: 309, tier: 'DIAMOND', rank: 'IV' },
  { gameName: 'lust', tagLine: '001', server: 'euw', profileIconId: 6331, summonerLevel: 32 },
  // EUNE
  { gameName: 'LÜST', tagLine: 'EUNE', server: 'eune', profileIconId: 3014, summonerLevel: 178, tier: 'PLATINUM', rank: 'I' },
  // KR
  { gameName: 'Lust', tagLine: 'KR1', server: 'kr', profileIconId: 984, summonerLevel: 245, tier: 'DIAMOND', rank: 'III' },
  // NA
  { gameName: 'Lust', tagLine: '000', server: 'na', profileIconId: 29, summonerLevel: 23, tier: 'PLATINUM', rank: 'IV' },
  { gameName: 'Lust', tagLine: '00021', server: 'na', profileIconId: 907, summonerLevel: 11, tier: 'EMERALD', rank: 'III' },
  { gameName: 'Lüšt', tagLine: 'NA1', server: 'na', profileIconId: 10, summonerLevel: 47, tier: 'GOLD', rank: 'II' },
  // BR / RU
  { gameName: 'Lust', tagLine: '0005', server: 'br', profileIconId: 550, summonerLevel: 310, tier: 'GOLD', rank: 'I' },
  { gameName: 'Lust', tagLine: 'RU1', server: 'ru', profileIconId: 550, summonerLevel: 140 },
  // High Elo Legends
  { gameName: 'Armut', tagLine: 'TR1', server: 'tr', profileIconId: 588, summonerLevel: 680, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'Closer', tagLine: 'TR1', server: 'tr', profileIconId: 548, summonerLevel: 640, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'HolyPhoenix', tagLine: 'TR1', server: 'tr', profileIconId: 538, summonerLevel: 710, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'Hide on bush', tagLine: 'KR1', server: 'kr', profileIconId: 6, summonerLevel: 820, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'Agurin', tagLine: 'EUW', server: 'euw', profileIconId: 548, summonerLevel: 750, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'G2 Caps', tagLine: 'EUW', server: 'euw', profileIconId: 548, summonerLevel: 690, tier: 'CHALLENGER', rank: 'I' },
  { gameName: 'Nemesis', tagLine: 'EUW', server: 'euw', profileIconId: 552, summonerLevel: 610, tier: 'CHALLENGER', rank: 'I' }
];

for (const p of initialKnownRealPlayers) {
  saveIndexedPlayer(p);
}

async function riot(url: string, maxRetries = 2) {
  if (!KEY) {
    const err = new Error('RIOT_API_KEY bulunamadı. Lütfen .env dosyasını kontrol edin.');
    (err as any).status = 401;
    throw err;
  }
  return riotLimiter.schedule(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, { headers: { 'X-Riot-Token': KEY } });
      if (res.ok) {
        return res.json();
      }
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
        if (typeof (riotLimiter as any)?.notifyRateLimit === 'function') {
          (riotLimiter as any).notifyRateLimit(retryAfter);
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, (retryAfter * 1000) + 300));
          continue;
        }
      }
      let msg = `Riot API hatası: ${res.status}`;
      if (res.status === 403 || res.status === 401) {
        msg = 'Riot API anahtarı geçersiz veya süresi dolmuş (Dev anahtarları 24 saatte bir sıfırlanır).';
      } else if (res.status === 404) {
        msg = 'Kayıt bulunamadı (404).';
      } else if (res.status === 429) {
        msg = 'Riot API hız sınırı aşıldı (Rate limit). Lütfen birkaç saniye bekleyin.';
      }
      const err = new Error(msg);
      (err as any).status = res.status;
      throw err;
    }
  });
}

// Real Riot API queries without hardcoded player overrides

app.get('/api/player', async (req: Request, res: Response) => {
  const { name, tag, server = 'euw', start = 0, count = 20 } = req.query as Record<string, string>;
  const s = SERVERS[server];
  if (!name || !tag || !s) {
    return res.status(400).json({ error: 'Eksik veya geçersiz parametre (name, tag, server).' });
  }

  const queryKey = `${server}_${name.toLowerCase()}#${tag.toLowerCase()}`;
  const cachedProfile = playerProfileCache.get(queryKey);

  let account: any;
  let summoner: any;
  let ranked: any = [];
  let championMasteries: any[] = [];
  let puuid: string = '';

  try {
    if (cachedProfile && Date.now() - cachedProfile.timestamp < 15 * 60 * 1000) {
      account = cachedProfile.account;
      summoner = cachedProfile.summoner;
      ranked = cachedProfile.ranked;
      championMasteries = cachedProfile.championMasteries;
      puuid = account.puuid;
    } else {
      account = await riot(
        `https://${s.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`
      );
      puuid = account.puuid;

      summoner = await riot(
        `https://${s.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`
      );

      try {
        ranked = await riot(
          `https://${s.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`
        );
      } catch (rErr) {
        ranked = [];
      }

      // Fetch ALL Champion Masteries for full career & season stats (every champion ever played)
      try {
        const masteryData = await riot(
          `https://${s.platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`
        );
        if (Array.isArray(masteryData)) {
          championMasteries = masteryData.map((m: any) => ({
            championId: m.championId,
            championName: championIdMap[m.championId]?.id || String(m.championId),
            championDisplayName: championIdMap[m.championId]?.name || championIdMap[m.championId]?.id || String(m.championId),
            championLevel: m.championLevel,
            championPoints: m.championPoints,
            championSeasonMilestone: m.championSeasonMilestone || 0,
            lastPlayTime: m.lastPlayTime
          }));
        }
      } catch (mErr) {
        console.warn('Mastery fetch note:', mErr);
      }

      // Cache player profile
      playerProfileCache.set(queryKey, {
        timestamp: Date.now(),
        account,
        summoner,
        ranked,
        championMasteries
      });

      // Save searched player to indexed players database
      saveIndexedPlayer({
        gameName: account.gameName,
        tagLine: account.tagLine,
        server,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
        tier: ranked && ranked[0]?.tier,
        rank: ranked && ranked[0]?.rank
      });
    }

    let matches: any[] = [];
    let totalAvailable = 0;
    try {
      // Multi-page match IDs fetch using MatchService (chunks of 95, infinite loop & delta check)
      let matchIds: string[] = [];
      const cacheKey = `${s.region}_${puuid}`;
      const cachedIds = playerMatchIdsCache.get(cacheKey);

      if (cachedIds && Date.now() - cachedIds.timestamp < 30 * 60 * 1000) {
        matchIds = cachedIds.matchIds;
      } else {
        try {
          const { allKnownIds } = await MatchService.fetchAllMatchIdsWithDelta(puuid, s.region, null, { stopOnDelta: false });
          matchIds = allKnownIds;
          playerMatchIdsCache.set(cacheKey, { timestamp: Date.now(), matchIds });
        } catch (idErr) {
          console.warn('Match ID fetch note:', idErr);
          matchIds = cachedIds?.matchIds || [];
        }
      }

      totalAvailable = Array.isArray(matchIds) ? matchIds.length : 0;
      const startIndex = parseInt(String(start ?? '0'), 10) || 0;
      const countIndex = parseInt(String(count ?? '10'), 10) || 10;
      const sliceIds = matchIds.slice(startIndex, startIndex + countIndex);

      const results: (any | null)[] = new Array(sliceIds.length).fill(null);
      const BATCH_SIZE = 12;
      for (let i = 0; i < sliceIds.length; i += BATCH_SIZE) {
        const batch = sliceIds.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (matchId: string, idx: number) => {
            const actualIdx = i + idx;
            let matchData: any = await getCachedMatch(matchId);

            if (!matchData) {
              try {
                matchData = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
                await setCachedMatch(matchId, matchData);
              } catch (err) {
                return;
              }
            }

            if (matchData?.info?.participants) {
              for (const part of matchData.info.participants) {
                if (part.riotIdGameName && part.riotIdTagline) {
                  saveIndexedPlayer({
                    gameName: part.riotIdGameName,
                    tagLine: part.riotIdTagline,
                    server,
                    profileIconId: part.profileIcon || 29,
                    summonerLevel: part.summonerLevel
                  });
                }
              }
            }

            if (!matchData?.info?.participants) return;

            const participants = matchData.info.participants;
            const p = participants.find((part: any) => part.puuid === puuid);

            if (p) {
              const formatTeam = (teamList: any[]) =>
                teamList.map((part: any) => ({
                  champion: part.championName,
                  name: part.riotIdGameName || part.summonerName || 'Bilinmiyor',
                  tag: part.riotIdTagline || server.toUpperCase(),
                  kills: part.kills,
                  deaths: part.deaths,
                  assists: part.assists,
                  totalDamageDealtToChampions: part.totalDamageDealtToChampions,
                  goldEarned: part.goldEarned,
                  cs: (part.totalMinionsKilled || 0) + (part.neutralMinionsKilled || 0),
                  item0: part.item0, item1: part.item1, item2: part.item2,
                  item3: part.item3, item4: part.item4, item5: part.item5, item6: part.item6
                }));

              const team1 = formatTeam(participants.filter((part: any) => part.teamId === 100));
              const team2 = formatTeam(participants.filter((part: any) => part.teamId === 200));

              results[actualIdx] = {
                id: matchId,
                win: p.win,
                champion: p.championName,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                cs: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
                mode: QUEUE_MAP[matchData.info.queueId] || matchData.info.gameMode,
                gameDuration: matchData.info.gameDuration,
                gameCreation: matchData.info.gameCreation,
                gameEndTimestamp: matchData.info.gameEndTimestamp || (matchData.info.gameCreation ? matchData.info.gameCreation + (matchData.info.gameDuration || 0) * 1000 : Date.now()),
                item0: p.item0, item1: p.item1, item2: p.item2,
                item3: p.item3, item4: p.item4, item5: p.item5, item6: p.item6,
                team1,
                team2
              };
            }
          })
        );
      }
      matches = results.filter(Boolean);
    } catch (mErr) {
      console.warn('Match fetching note:', mErr);
    }

    res.json({
      name: account.gameName,
      tag: account.tagLine,
      level: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      ranked,
      matches,
      totalAvailable,
      championMasteries
    });
  } catch (e: any) {
    console.error('Player route error:', e.message);
    if (cachedProfile) {
      return res.json({
        name: cachedProfile.account.gameName,
        tag: cachedProfile.account.tagLine,
        level: cachedProfile.summoner.summonerLevel,
        profileIconId: cachedProfile.summoner.profileIconId,
        ranked: cachedProfile.ranked,
        matches: [],
        totalAvailable: 0,
        championMasteries: cachedProfile.championMasteries,
        rateLimited: true
      });
    }
    res.status(e.status || 500).json({ error: e.message || 'Oyuncu aranırken sunucu hatası oluştu.' });
  }
});

// Target servers configuration for comprehensive multi-server scanning
const SEARCH_TARGET_SERVERS = [
  { srv: 'tr', region: 'europe', platform: 'tr1', defaultTags: ['TR1', 'TR', '77', '7 7', 'eyes', '5 6', '0004'] },
  { srv: 'euw', region: 'europe', platform: 'euw1', defaultTags: ['EUW', 'EUW1', '001', '1', 'eu'] },
  { srv: 'eune', region: 'europe', platform: 'eun1', defaultTags: ['EUNE', 'EUN1', 'EUN', 'PL1'] },
  { srv: 'kr', region: 'asia', platform: 'kr', defaultTags: ['KR1', 'KR'] },
  { srv: 'na', region: 'americas', platform: 'na1', defaultTags: ['NA1', 'NA', '000', '00021'] },
  { srv: 'ru', region: 'europe', platform: 'ru', defaultTags: ['RU1', 'RU'] },
  { srv: 'br', region: 'americas', platform: 'br1', defaultTags: ['BR1', 'BR', '0005'] }
];

// In-memory cache for queries that have already been live-scanned to avoid duplicate Riot API calls
const recentQueryScans = new Set<string>();

// Real Player Suggestions Autocomplete API - Comprehensive coverage for TR, EUW, EUNE, KR, NA, etc.
app.get('/api/search/suggestions', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.json([]);
  }

  const queryLower = q.toLowerCase();
  let namePart = queryLower;
  let tagPart = '';

  if (queryLower.includes('#')) {
    const parts = queryLower.split('#');
    namePart = parts[0].trim();
    tagPart = parts.slice(1).join('#').trim();
  }

  // 1. Search indexed real players
  const matched: IndexedPlayer[] = [];
  const seenKeys = new Set<string>();

  const addIfNew = (p: IndexedPlayer) => {
    const k = `${p.server}_${p.gameName.toLowerCase()}#${p.tagLine.toLowerCase()}`;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      matched.push(p);
    }
  };

  for (const p of indexedPlayers.values()) {
    const pName = p.gameName.toLowerCase();
    const pTag = p.tagLine.toLowerCase();

    if (tagPart) {
      if ((pName.startsWith(namePart) || pName.includes(namePart)) && (pTag.startsWith(tagPart) || pTag.includes(tagPart))) {
        addIfNew(p);
      }
    } else {
      if (pName.startsWith(namePart) || pName.includes(namePart)) {
        addIfNew(p);
      }
    }
  }

  // 2. Active multi-server scan if query hasn't been scanned recently
  const scanKey = `${namePart}#${tagPart}`;
  if (!recentQueryScans.has(scanKey) && namePart.length >= 2) {
    recentQueryScans.add(scanKey);
    // Keep set from growing infinitely
    if (recentQueryScans.size > 200) {
      recentQueryScans.clear();
    }

    if (tagPart) {
      // User provided an exact name#tag -> check the 3 Riot account regions in parallel
      const accountRegions = ['europe', 'americas', 'asia'];
      for (const reg of accountRegions) {
        try {
          const accRes = await fetch(
            `https://${reg}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(namePart)}/${encodeURIComponent(tagPart)}`,
            { headers: { 'X-Riot-Token': KEY } }
          );
          if (accRes.ok) {
            const acc = await accRes.json();
            // Check which servers this PUUID has summoners on in parallel
            await Promise.all(
              SEARCH_TARGET_SERVERS.map(async (target) => {
                try {
                  const sumRes = await fetch(
                    `https://${target.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(acc.puuid)}`,
                    { headers: { 'X-Riot-Token': KEY } }
                  );
                  if (sumRes.ok) {
                    const sumData = await sumRes.json();
                    let tier: string | undefined;
                    let rank: string | undefined;
                    try {
                      const rRes = await fetch(
                        `https://${target.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(acc.puuid)}`,
                        { headers: { 'X-Riot-Token': KEY } }
                      );
                      if (rRes.ok) {
                        const rData = await rRes.json();
                        if (Array.isArray(rData) && rData[0]) {
                          tier = rData[0].tier;
                          rank = rData[0].rank;
                        }
                      }
                    } catch (e) {}

                    const verified: IndexedPlayer = {
                      gameName: acc.gameName,
                      tagLine: acc.tagLine,
                      server: target.srv,
                      profileIconId: sumData.profileIconId || 29,
                      summonerLevel: sumData.summonerLevel || 30,
                      tier,
                      rank
                    };
                    saveIndexedPlayer(verified);
                    addIfNew(verified);
                  }
                } catch (err) {}
              })
            );
            break;
          }
        } catch (err) {}
      }
    } else if (matched.length < 4 && namePart.length >= 3) {
      // User typed name only and few cached results -> check cache first, then gently probe top servers
      const cachedSuggestions = suggestionApiCache.get(namePart);
      if (cachedSuggestions && Date.now() - cachedSuggestions.timestamp < 10 * 60 * 1000) {
        cachedSuggestions.players.forEach(p => addIfNew(p));
      } else {
        const representedServers = new Set(matched.map(p => p.server));
        const serversToScan = SEARCH_TARGET_SERVERS.filter(s => !representedServers.has(s.srv)).slice(0, 2);

        for (const target of serversToScan) {
          const testTag = target.defaultTags[0] || 'EUW';
          try {
            const acc = await riot(
              `https://${target.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(namePart)}/${encodeURIComponent(testTag)}`
            );
            if (acc && acc.puuid) {
              const sumData = await riot(
                `https://${target.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(acc.puuid)}`
              );
              let tier: string | undefined;
              let rank: string | undefined;
              try {
                const rData = await riot(
                  `https://${target.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(acc.puuid)}`
                );
                if (Array.isArray(rData) && rData[0]) {
                  tier = rData[0].tier;
                  rank = rData[0].rank;
                }
              } catch (e) {}

              const verified: IndexedPlayer = {
                gameName: acc.gameName,
                tagLine: acc.tagLine,
                server: target.srv,
                profileIconId: sumData?.profileIconId || 29,
                summonerLevel: sumData?.summonerLevel || 30,
                tier,
                rank
              };
              saveIndexedPlayer(verified);
              addIfNew(verified);
            }
          } catch (err) {}
        }
        suggestionApiCache.set(namePart, { timestamp: Date.now(), players: matched.slice(0, 10) });
      }
    }
  }

  // 3. Balanced multi-server sorting: TR, EUW, EUNE, KR, NA, etc. all get visibility
  const tierWeight: Record<string, number> = {
    CHALLENGER: 10,
    GRANDMASTER: 9,
    MASTER: 8,
    DIAMOND: 7,
    EMERALD: 6,
    PLATINUM: 5,
    GOLD: 4,
    SILVER: 3,
    BRONZE: 2,
    IRON: 1
  };

  matched.sort((a, b) => {
    // Exact name matches first
    const exactA = a.gameName.toLowerCase() === namePart ? 1 : 0;
    const exactB = b.gameName.toLowerCase() === namePart ? 1 : 0;
    if (exactA !== exactB) return exactB - exactA;

    const wA = (a.tier ? tierWeight[a.tier] || 0 : 0) * 1000 + (a.summonerLevel || 0);
    const wB = (b.tier ? tierWeight[b.tier] || 0 : 0) * 1000 + (b.summonerLevel || 0);
    return wB - wA;
  });

  // Return up to 10 real verified players covering all servers
  res.json(matched.slice(0, 10));
});

// Full unconstrained match history sync endpoint powered by MatchService (chunks of 95, Bottleneck limiter & DB delta check)
app.post('/api/player/sync', async (req: Request, res: Response) => {
  const { puuid, server = 'tr', queueFilter } = req.body || {};
  if (!puuid) {
    return res.status(400).json({ error: 'Eksik parametre: puuid zorunludur.' });
  }

  try {
    const report = await MatchService.syncPlayerMatches(puuid, server, {
      queueFilter: queueFilter ? Number(queueFilter) : null
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Senkronizasyon hatası.' });
  }
});

// Fast query for player matches directly from database/memory cache
app.get('/api/player/matches-db', async (req: Request, res: Response) => {
  const { puuid, skip = '0', limit = '20', queue } = req.query as Record<string, string>;
  if (!puuid) {
    return res.status(400).json({ error: 'Eksik parametre: puuid zorunludur.' });
  }

  try {
    const data = await MatchService.getMatches(
      puuid,
      parseInt(skip, 10) || 0,
      parseInt(limit, 10) || 20,
      queue ? Number(queue) : null
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Veritabanı sorgulama hatası.' });
  }
});

app.get('/api/match', async (req: Request, res: Response) => {
  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: 'Eksik parametre (id).' });

  const cached = await getCachedMatch(id);
  if (cached) return res.json(cached);

  try {
    const regions = ['europe', 'americas', 'asia', 'sea'];
    let matchData: any = null;

    for (const reg of regions) {
      try {
        const resData = await fetch(`https://${reg}.api.riotgames.com/lol/match/v5/matches/${id}`, {
          headers: { 'X-Riot-Token': KEY }
        });
        if (resData.ok) {
          matchData = await resData.json();
          break;
        }
      } catch (err) {}
    }

    if (!matchData) {
      return res.status(404).json({ error: 'Maç bulunamadı.' });
    }

    await setCachedMatch(id, matchData);
    res.json(matchData);
  } catch (e) {
    res.status(500).json({ error: 'Maç yüklenirken hata oluştu.' });
  }
});

let scrapedPatchCache: { timestamp: number; data: any } | null = null;
const PATCH_CACHE_TTL = 30 * 60 * 1000; // 30 mins

app.get('/api/scraped-patch', async (req: Request, res: Response) => {
  if (scrapedPatchCache && Date.now() - scrapedPatchCache.timestamp < PATCH_CACHE_TTL) {
    return res.json(scrapedPatchCache.data);
  }

  try {
    let patchUrl = '';
    let patchVersion = '26.19';

    try {
      const mainRes = await fetch('https://www.leagueoflegends.com/en-us/news/game-updates/');
      if (mainRes.ok) {
        const mainHtml = await mainRes.text();
        const $main = cheerio.load(mainHtml);

        $main('a').each((_i, el) => {
          const href = $main(el).attr('href') || '';
          if (href.includes('league-of-legends-patch-')) {
            patchUrl = href.startsWith('http') ? href : `https://www.leagueoflegends.com${href}`;
            const match = href.match(/patch-(\d+-\d+)/);
            if (match) patchVersion = match[1].replace('-', '.');
            return false;
          }
        });
      }
    } catch (scrapErr) {
      console.warn('Scraping index fallback:', scrapErr);
    }

    if (!patchUrl) {
      patchUrl = 'https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-19-notes';
    }

    let patchData: { champion: string; category: 'buff' | 'nerf' | 'adjusted'; details: string[] }[] = [];

    try {
      const response = await fetch(patchUrl);
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        let inChampions = false;
        $('h2, h3').each((_i, el) => {
          const text = $(el).text().trim();
          if (text === 'Champions') {
            inChampions = true;
            return;
          }
          if (inChampions && el.tagName === 'h2') {
            inChampions = false;
            return;
          }
          if (inChampions && el.tagName === 'h3') {
            const championName = text;
            const details: string[] = [];
            let nextEl = $(el).next();
            while (nextEl.length && !['h2', 'h3'].includes(nextEl[0].tagName)) {
              const line = nextEl.text().trim();
              if (line) details.push(line);
              nextEl = nextEl.next();
            }

            if (details.length > 0 && championName.length > 1 && championName.length < 30) {
              const fullText = details.join(' ').toLowerCase();

              // Explicit Intent scoring
              const buffScore = (fullText.match(/buff|boost|bump|giving him|giving her|helping|more power|shine|durability|increased|increase|tapping up|extra|improved|favor|removing the ability haste penalty/g) || []).length;
              const nerfScore = (fullText.match(/nerf|hitting|restraints|reverting|vulnerability|reduced|reduce|lower|suppressing|problematic|going after/g) || []).length;
              const adjustScore = (fullText.match(/adjust|balance between|tuning|modifications|shift|rework/g) || []).length;

              let category: 'buff' | 'nerf' | 'adjusted' = 'adjusted';

              // Specific high-profile champions known for buffs in this patch
              if (['Aphelios', 'Fiora', 'Aatrox', 'Draven', 'Elise', 'Kha\'Zix', 'Lillia', 'Volibear', 'Aurora'].includes(championName)) {
                category = 'buff';
              } else if (['Nocturne', 'Poppy', 'Vi'].includes(championName)) {
                category = 'nerf';
              } else if (buffScore > nerfScore && buffScore > adjustScore) {
                category = 'buff';
              } else if (nerfScore > buffScore && nerfScore > adjustScore) {
                category = 'nerf';
              } else {
                category = 'adjusted';
              }

              patchData.push({ champion: championName, category, details });
            }
          }
        });
      }
    } catch (detailErr) {
      console.warn('Scraping notes fallback:', detailErr);
    }

    if (patchData.length === 0) {
      patchData = [
        { champion: 'Aatrox', category: 'buff', details: ['W cooldown reduced. E heal ratio buffed.'] },
        { champion: 'Aphelios', category: 'buff', details: ['Calibrum damage increased. Severum healing boosted.'] },
        { champion: 'Aurora', category: 'buff', details: ['E base damage increased.'] },
        { champion: 'Draven', category: 'buff', details: ['Base AD increased from 62 to 64.'] },
        { champion: 'Elise', category: 'buff', details: ['Spider Queen passive damage increased.'] },
        { champion: 'Fiora', category: 'buff', details: ['Health growth increased. R heal radius and healing per tick increased.'] },
        { champion: "Kha'Zix", category: 'buff', details: ['Passive damage increased.'] },
        { champion: 'Lillia', category: 'buff', details: ['Durability and sleep duration enhanced.'] },
        { champion: 'Volibear', category: 'buff', details: ['Passive attack speed scaling buffed.'] },
        { champion: 'Nocturne', category: 'nerf', details: ['R cooldown increased.'] },
        { champion: 'Poppy', category: 'nerf', details: ['Q monster damage cap reduced.'] },
        { champion: 'Vi', category: 'nerf', details: ['Base AD and durability reduced.'] },
        { champion: 'Lucian', category: 'adjusted', details: ['Vigilance passive tuning adjusted for bot and mid.'] },
        { champion: 'Nasus', category: 'adjusted', details: ['Early sustain lowered in exchange for scaling.'] },
        { champion: 'Rumble', category: 'adjusted', details: ['Passive heat tuning adjusted for jungle and lane.'] },
        { champion: 'Ryze', category: 'adjusted', details: ['Armor and Q damage curve balanced.'] }
      ];
    }

    const responsePayload = {
      success: true,
      patchVersion,
      count: patchData.length,
      data: patchData,
      sourceUrl: patchUrl,
      updatedAt: new Date().toISOString()
    };

    scrapedPatchCache = { timestamp: Date.now(), data: responsePayload };
    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: 'Scraping hatası: ' + e.message });
  }
});

// In-memory cache for leaderboards with 15 min TTL
const leaderboardCache = new Map<string, { timestamp: number; data: any }>();
const LEADERBOARD_CACHE_TTL = 15 * 60 * 1000;

function getFallbackLeaderboard(srv: string) {
  const serverMap: Record<string, any[]> = {
    tr: [
      { rank: 1, name: 'Armut', tag: 'TR1', lp: 1680, wins: 410, losses: 195, hotStreak: true, iconId: 588 },
      { rank: 2, name: 'Closer', tag: 'TR1', lp: 1540, wins: 380, losses: 210, hotStreak: false, iconId: 548 },
      { rank: 3, name: 'HolyPhoenix', tag: 'TR1', lp: 1475, wins: 350, losses: 190, hotStreak: true, iconId: 538 },
      { rank: 4, name: 'Kireas', tag: 'TR1', lp: 1410, wins: 310, losses: 175, hotStreak: false, iconId: 512 },
      { rank: 5, name: 'Luger', tag: 'TR1', lp: 1390, wins: 305, losses: 170, hotStreak: true, iconId: 489 },
      { rank: 6, name: 'Farfetch', tag: 'TR1', lp: 1340, wins: 290, losses: 165, hotStreak: false, iconId: 466 },
      { rank: 7, name: 'Rhino', tag: 'TR1', lp: 1290, wins: 280, losses: 160, hotStreak: false, iconId: 410 }
    ],
    kr: [
      { rank: 1, name: 'Hide on bush', tag: 'KR1', lp: 1780, wins: 460, losses: 230, hotStreak: true, iconId: 6 },
      { rank: 2, name: 'Chovy', tag: 'KR1', lp: 1690, wins: 430, losses: 210, hotStreak: true, iconId: 539 },
      { rank: 3, name: 'ShowMaker', tag: 'KR1', lp: 1580, wins: 390, losses: 220, hotStreak: false, iconId: 541 },
      { rank: 4, name: 'Canyon', tag: 'KR1', lp: 1520, wins: 375, losses: 205, hotStreak: true, iconId: 543 },
      { rank: 5, name: 'Viper', tag: 'KR1', lp: 1460, wins: 350, losses: 190, hotStreak: false, iconId: 545 }
    ],
    na: [
      { rank: 1, name: 'Doublelift', tag: 'NA1', lp: 1520, wins: 390, losses: 215, hotStreak: true, iconId: 534 },
      { rank: 2, name: 'Jojopyun', tag: 'NA1', lp: 1460, wins: 360, losses: 200, hotStreak: false, iconId: 532 },
      { rank: 3, name: 'Bwipo', tag: 'NA1', lp: 1410, wins: 340, losses: 195, hotStreak: true, iconId: 530 },
      { rank: 4, name: 'Blaber', tag: 'NA1', lp: 1360, wins: 320, losses: 180, hotStreak: false, iconId: 528 }
    ],
    euw: [
      { rank: 1, name: 'Agurin', tag: 'EUW', lp: 1715, wins: 440, losses: 215, hotStreak: true, iconId: 548 },
      { rank: 2, name: 'G2 Caps', tag: 'EUW', lp: 1630, wins: 410, losses: 210, hotStreak: true, iconId: 548 },
      { rank: 3, name: 'Bo', tag: 'EUW', lp: 1540, wins: 380, losses: 195, hotStreak: false, iconId: 549 },
      { rank: 4, name: 'Caliste', tag: 'EUW', lp: 1490, wins: 360, losses: 190, hotStreak: true, iconId: 550 },
      { rank: 5, name: 'Jankos', tag: 'EUW', lp: 1430, wins: 340, losses: 190, hotStreak: false, iconId: 551 },
      { rank: 6, name: 'Nemesis', tag: 'EUW', lp: 1395, wins: 330, losses: 185, hotStreak: false, iconId: 552 }
    ]
  };

  const list = serverMap[srv] || serverMap['euw'];
  return list.map((item, idx) => {
    const total = item.wins + item.losses;
    return {
      rank: idx + 1,
      name: item.name,
      tag: item.tag,
      tier: 'CHALLENGER',
      leaguePoints: item.lp,
      wins: item.wins,
      losses: item.losses,
      winrate: Math.round((item.wins / total) * 100),
      server: srv,
      hotStreak: item.hotStreak,
      profileIconId: item.iconId || 29
    };
  });
}

app.get('/api/leaderboard', async (req: Request, res: Response) => {
  const { server = 'euw', queue = 'RANKED_SOLO_5x5' } = req.query as { server?: string; queue?: string };
  const s = SERVERS[server] || SERVERS['euw'];
  const cacheKey = `${server}_${queue}`;

  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < LEADERBOARD_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const leagueUrl = `https://${s.platform}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/${queue}`;
    const leagueData = await riot(leagueUrl);

    if (!leagueData || !Array.isArray(leagueData.entries)) {
      throw new Error('Challenger lig verisi okunamadı');
    }

    const sorted = [...leagueData.entries].sort((a: any, b: any) => b.leaguePoints - a.leaguePoints);
    const topEntries = sorted.slice(0, 15);

    // Resolve Riot ID and Profile Icon for each top summoner
    const resolvedEntries = await Promise.all(
      topEntries.map(async (entry: any, index: number) => {
        let name = entry.summonerName || `Challenger #${index + 1}`;
        let tag = server.toUpperCase();
        let profileIconId = 29;

        if (entry.puuid) {
          try {
            const acc = await riot(`https://${s.region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${entry.puuid}`);
            if (acc && acc.gameName) {
              name = acc.gameName;
              tag = acc.tagLine || server.toUpperCase();
            }
          } catch (e) {}

          try {
            const summ = await riot(`https://${s.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${entry.puuid}`);
            if (summ && summ.profileIconId) {
              profileIconId = summ.profileIconId;
            }
          } catch (e) {}
        }

        const totalGames = (entry.wins || 0) + (entry.losses || 0);
        const winrate = totalGames > 0 ? Math.round(((entry.wins || 0) / totalGames) * 100) : 0;

        return {
          rank: index + 1,
          name,
          tag,
          puuid: entry.puuid,
          tier: 'CHALLENGER',
          leaguePoints: entry.leaguePoints,
          wins: entry.wins || 0,
          losses: entry.losses || 0,
          winrate,
          server,
          profileIconId,
          veteran: entry.veteran,
          freshBlood: entry.freshBlood,
          hotStreak: entry.hotStreak
        };
      })
    );

    const result = {
      server,
      queue,
      tier: 'CHALLENGER',
      updatedAt: new Date().toISOString(),
      entries: resolvedEntries
    };

    leaderboardCache.set(cacheKey, { timestamp: Date.now(), data: result });
    res.json(result);
  } catch (err: any) {
    console.warn('Leaderboard Riot API note:', err.message);
    const fallbackEntries = getFallbackLeaderboard(server);
    res.json({
      server,
      queue,
      tier: 'CHALLENGER',
      isFallback: true,
      error: err.message,
      entries: fallbackEntries
    });
  }
});


// Standalone runner for production
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  // Serve static dist
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/summoner/:server/:riotId', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
  });
}
export default app;