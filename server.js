require("dotenv").config();
const express = require("express");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.static("public"));
const KEY = process.env.RIOT_API_KEY;

// Maç detaylarını kalıcı olarak saklamak için basit bir cache dosyası yolu
const CACHE_FILE = path.join(__dirname, "match_cache.json");
let matchCache = {};

// Sunucu başlarken daha önceden kaydedilmiş maç cache'ini yükle
if (fs.existsSync(CACHE_FILE)) {
  try {
    matchCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch (e) {
    matchCache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(matchCache), "utf8");
  } catch (e) {}
}

const SERVERS = {
  euw: { platform: "euw1", region: "europe" },
  tr: { platform: "tr1", region: "europe" },
  na: { platform: "na1", region: "americas" },
  kr: { platform: "kr", region: "asia" },
  eune: { platform: "eun1", region: "europe" },
  oce: { platform: "oc1", region: "sea" },
  br: { platform: "br1", region: "americas" },
  las: { platform: "la2", region: "americas" },
  lan: { platform: "la1", region: "americas" },
  jp: { platform: "jp1", region: "asia" }
};

const QUEUE_MAP = {
  400: "Sıralı Seçim", 420: "Tekli/Çiftli", 430: "Kapalı Seçim", 440: "Esnek",
  450: "ARAM", 490: "Hızlı Oyun", 700: "Clash", 900: "URF", 1700: "Arena"
};

async function riot(url) {
  const res = await fetch(url, { headers: { "X-Riot-Token": KEY } });
  if (!res.ok) {
    const err = new Error(`Riot API hatası: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

app.get("/api/player", async (req, res) => {
  const { name, tag, server = "euw", start = 0, count = 20 } = req.query;
  const s = SERVERS[server];
  if (!name || !tag || !s) return res.status(400).json({ error: "Eksik parametre" });

  try {
    const account = await riot(`https://${s.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
    const summoner = await riot(`https://${s.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`);
    const ranked = await riot(`https://${s.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`);

    let matches = [];
    let totalAvailable = 0;
    try {
      const startTime = Math.floor((Date.now() - 400 * 24 * 60 * 60 * 1000) / 1000);
      const matchIds = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?startTime=${startTime}&start=0&count=100`);
      
      totalAvailable = matchIds.length;
      const sliceIds = matchIds.slice(parseInt(start), parseInt(start) + parseInt(count));

      for (const matchId of sliceIds) {
        let matchData;
        
        // Önce cache'e bakıyoruz, varsa oradan alıyoruz (Hızlı ve Riot'u yormaz)
        if (matchCache[matchId]) {
          matchData = matchCache[matchId];
        } else {
          // Yoksa Riot API'den çekip cache'e kaydediyoruz
          try {
            matchData = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
            matchCache[matchId] = matchData;
            saveCache();
          } catch (err) {
            continue; // Eski veya silinmiş maçsa atla
          }
        }

        const participants = matchData.info.participants;
        const p = participants.find(part => part.puuid === account.puuid);
        
        if (p) {
          const formatTeam = (teamList) => teamList.map(part => ({
            champion: part.championName,
            name: part.riotIdGameName || part.summonerName || "Bilinmiyor",
            tag: part.riotIdTagline || server.toUpperCase()
          }));

          const team1 = formatTeam(participants.filter(part => part.teamId === 100));
          const team2 = formatTeam(participants.filter(part => part.teamId === 200));

          matches.push({
            id: matchId,
            win: p.win,
            champion: p.championName,
            kills: p.kills, 
            deaths: p.deaths, 
            assists: p.assists,
            mode: QUEUE_MAP[matchData.info.queueId] || matchData.info.gameMode,
            item0: p.item0, item1: p.item1, item2: p.item2,
            item3: p.item3, item4: p.item4, item5: p.item5, item6: p.item6,
            team1: team1,
            team2: team2
          });
        }
      }
    } catch (mErr) {}

    res.json({ name: account.gameName, tag: account.tagLine, level: summoner.summonerLevel, profileIconId: summoner.profileIconId, ranked, matches, totalAvailable });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// Maç detay rotası (Önce cache kontrolü yapar, yoksa çoklu bölge tarar ve cache'e kaydeder)
app.get("/api/match", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Eksik parametre" });

  // 1. Önce lokal cache'de var mı diye bak (Eğer daha önce görüntülendiyse Riot silse bile buradan döner)
  if (matchCache[id]) {
    return res.json(matchCache[id]);
  }

  try {
    let regions = ["europe", "americas", "asia", "sea"];
    if (id.startsWith("TR1_") || id.startsWith("EUW1_") || id.startsWith("EUN1_")) {
      regions = ["europe", "americas", "asia", "sea"];
    } else if (id.startsWith("NA1_") || id.startsWith("BR1_")) {
      regions = ["americas", "europe", "asia", "sea"];
    } else if (id.startsWith("KR_") || id.startsWith("JP1_")) {
      regions = ["asia", "europe", "americas", "sea"];
    }

    let matchData = null;
    for (const reg of regions) {
      try {
        const resData = await fetch(`https://${reg}.api.riotgames.com/lol/match/v5/matches/${id}`, {
          headers: { "X-Riot-Token": KEY }
        });
        if (resData.ok) {
          matchData = await resData.json();
          break;
        }
      } catch (err) {}
    }

    if (!matchData) {
      return res.status(404).json({ error: "Maç bulunamadı." });
    }

    // Başarıyla bulundu, hemen cache'e kaydedip diske yazalım
    matchCache[id] = matchData;
    saveCache();

    res.json(matchData);
  } catch (e) {
    res.status(500).json({ error: "Maç yüklenirken hata oluştu." });
  }
});

app.get("/api/scraped-patch", async (req, res) => {
  try {
    const mainRes = await fetch("https://www.leagueoflegends.com/en-us/news/game-updates/");
    const mainHtml = await mainRes.text();
    const $main = cheerio.load(mainHtml);
    
    let patchUrl = "";
    let patchVersion = "26.19";

    $main("a").each((i, el) => {
      const href = $main(el).attr("href") || "";
      if (href.includes("league-of-legends-patch-")) {
        patchUrl = href.startsWith("http") ? href : `https://www.leagueoflegends.com${href}`;
        const match = href.match(/patch-(\d+-\d+)/);
        if (match) patchVersion = match[1].replace("-", ".");
        return false;
      }
    });

    if (!patchUrl) patchUrl = "https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-19-notes/";

    const response = await fetch(patchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    let patchData = [];
    $("h2, h3").each((i, el) => {
      const title = $(el).text().trim();
      if (title.length > 2 && title.length < 20 && !title.includes("Patch") && !title.includes("Notes")) {
        let details = [];
        let nextEl = $(el).next();
        let count = 0;
        while(nextEl.length && !["h2", "h3", "h1"].includes(nextEl[0].tagName) && count < 5) {
          const text = nextEl.text().trim();
          if(text) details.push(text);
          nextEl = nextEl.next();
          count++;
        }
        if (details.length > 0) patchData.push({ champion: title, details });
      }
    });

    res.json({ success: true, patchVersion, count: patchData.length, data: patchData });
  } catch (e) {
    res.status(500).json({ error: "Scraping hatası" });
  }
});

app.listen(3000, () => console.log("Sunucu çalışıyor: http://localhost:3000"));