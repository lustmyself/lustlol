require("dotenv").config();
const express = require("express");
const cheerio = require("cheerio");

const app = express();
app.use(express.static("public"));
const KEY = process.env.RIOT_API_KEY;

const SERVERS = {
  euw: { platform: "euw1", region: "europe" },
  tr: { platform: "tr1", region: "europe" },
};

const QUEUE_MAP = {
  400: "Sıralı Seçim", 420: "Tekli/Çiftli", 430: "Kapalı Seçim", 440: "Esnek",
  450: "ARAM", 490: "Hızlı Oyun", 700: "Clash", 900: "URF", 1700: "Arena"
};

async function riot(url) {
  const res = await fetch(url, { headers: { "X-Riot-Token": KEY } });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error("Riot API hatası");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

app.get("/api/player", async (req, res) => {
  const { name, tag, server = "euw" } = req.query;
  const s = SERVERS[server];
  if (!name || !tag || !s) return res.status(400).json({ error: "Eksik parametre" });

  try {
    const account = await riot(`https://${s.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
    const summoner = await riot(`https://${s.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`);
    const ranked = await riot(`https://${s.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`);

    let matches = [];
    try {
      const startTime = Math.floor((Date.now() - 400 * 24 * 60 * 60 * 1000) / 1000);
      const matchIds = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?startTime=${startTime}&start=0&count=20`);

      for (const matchId of matchIds) {
        const matchData = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
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

    res.json({ name: account.gameName, tag: account.tagLine, level: summoner.summonerLevel, profileIconId: summoner.profileIconId, ranked, matches });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get("/api/match", async (req, res) => {
  const { id, server = "euw" } = req.query;
  const s = SERVERS[server];
  if (!id || !s) return res.status(400).json({ error: "Eksik parametre" });

  try {
    const matchData = await riot(`https://${s.region}.api.riotgames.com/lol/match/v5/matches/${id}`);
    res.json(matchData);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get("/api/scraped-patch", async (req, res) => {
  try {
    const response = await fetch("https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-19-notes/");
    const html = await response.text();
    const $ = cheerio.load(html);

    let patchData = [];
    $("h2, h3").each((i, el) => {
      const title = $(el).text().trim();
      if (["Aatrox", "Aphelios", "Aurora", "Draven", "Elise", "Fiora", "Kha'Zix", "Lillia", "Master Yi", "Volibear", "Nasus", "Nocturne", "Poppy", "Rumble", "Ryze", "Vi", "Lucian"].includes(title)) {
        let details = [];
        let nextEl = $(el).next();
        while(nextEl.length && !["h2", "h3", "h1"].includes(nextEl[0].tagName)) {
          const text = nextEl.text().trim();
          if(text) details.push(text);
          nextEl = nextEl.next();
        }
        patchData.push({ champion: title, details });
      }
    });

    res.json({ success: true, count: patchData.length, data: patchData });
  } catch (e) {
    res.status(500).json({ error: "Scraping hatası" });
  }
});

app.listen(3000, () => console.log("Sunucu çalışıyor: http://localhost:3000"));