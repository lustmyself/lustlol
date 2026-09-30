<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Match Details - lustlol.lol</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#1a202c;--card:#2d3748;--border:#4a5568;--win-bg:rgba(43,108,176,0.2);--loss-bg:rgba(197,48,48,0.2);--text:#fff;--muted:#a0aec0}
body{background:var(--bg);color:var(--text);font-family:Sora,sans-serif;padding:32px;display:flex;flex-direction:column;align-items:center}
.container{width:min(900px,100%);background:var(--card);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
.header{text-align:center;padding:24px;border-bottom:1px solid var(--border);background:#222b38}
.header h1{font-size:24px;margin-bottom:4px}
.header span{color:var(--muted);font-size:14px}
.team{padding:16px}
.team-title{font-weight:800;font-size:18px;margin-bottom:16px;padding:0 16px;display:flex;justify-content:space-between}
.team.win .team-title{color:#63b3ed}
.team.loss .team-title{color:#fc8181}
.player{display:flex;align-items:center;padding:8px 16px;border-radius:8px;margin-bottom:4px}
.team.win .player{background:var(--win-bg)}
.team.loss .player{background:var(--loss-bg)}
.p-champ{width:40px;height:40px;border-radius:50%;margin-right:16px}
.p-name{flex:1;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p-kda{width:100px;text-align:center;font-size:15px;font-weight:600}
.p-kda span{display:block;font-size:11px;color:var(--muted)}
.p-items{display:flex;gap:4px;width:180px;justify-content:center}
.item{width:28px;height:28px;border-radius:4px;background:rgba(0,0,0,0.3)}
.p-cs{width:80px;text-align:right;font-size:13px;color:var(--muted)}
</style>
</head>
<body>

<div id="out" class="container"><h2 style="text-align:center;padding:40px">Maç verileri yükleniyor...</h2></div>

<script>
const $=id=>document.getElementById(id);
let ver="14.24.1";
fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json()).then(v=>ver=v[0]).catch(()=>{});

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

let server = params.get("server");
if (!server) {
  const savedPlayers = JSON.parse(localStorage.getItem("lustlol_players") || "[]");
  server = savedPlayers.length > 0 ? savedPlayers[0].server : "tr";
}

if(!matchId) $("out").innerHTML = "<h2 style='text-align:center;padding:40px'>Geçersiz Maç ID</h2>";
else loadMatch();

async function loadMatch(){
  try{
    const r = await fetch(`/api/match?id=${matchId}&server=${server}`);
    const d = await r.json();
    if(!r.ok) throw new Error("API Hatası");
    
    const mode = d.info.gameMode;
    const duration = Math.floor(d.info.gameDuration / 60) + "m " + (d.info.gameDuration % 60) + "s";
    
    let winTeamHTML = '<div class="team win"><div class="team-title"><span>VICTORY</span></div>';
    let lossTeamHTML = '<div class="team loss"><div class="team-title"><span>DEFEAT</span></div>';
    
    d.info.participants.forEach(p => {
      let items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map(i => 
        i === 0 ? `<div class="item"></div>` : `<img class="item" src="https://ddragon.leagueoflegends.com/cdn/${ver}/img/item/${i}.png">`
      ).join("");

      const kdaRatio = p.deaths === 0 ? "Perfect" : ((p.kills + p.assists) / p.deaths).toFixed(2);
      
      const row = `
        <div class="player">
          <img class="p-champ" src="https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${p.championName}.png">
          <div class="p-name">${p.riotIdGameName} <span style="color:var(--muted);font-weight:400">#${p.riotIdTagline}</span></div>
          <div class="p-kda">${p.kills} / ${p.deaths} / ${p.assists}<span>${kdaRatio} KDA</span></div>
          <div class="p-items">${items}</div>
          <div class="p-cs">${p.totalMinionsKilled + p.neutralMinionsKilled} CS<br><span>${p.goldEarned.toLocaleString()} Gold</span></div>
        </div>`;
        
      if(p.win) winTeamHTML += row;
      else lossTeamHTML += row;
    });

    winTeamHTML += '</div>';
    lossTeamHTML += '</div>';

    $("out").innerHTML = `
      <div class="header">
        <h1>${mode}</h1>
        <span>Duration: ${duration}</span>
      </div>
      ${winTeamHTML}
      ${lossTeamHTML}
    `;
  }catch(e){
    $("out").innerHTML = `
      <div style="text-align:center; padding: 60px 20px;">
        <h2 style="color: #fc8181; margin-bottom: 12px;">Maç Detaylarına Ulaşılamıyor</h2>
        <p style="color: var(--muted); font-size: 14px; max-width: 450px; margin: 0 auto 24px auto;">
          Bu maç çok eski bir tarihe ait olabilir veya Riot Games sunucuları bu maçın detay verisini arşivden kaldırmış/silmiş olabilir.
        </p>
        <a href="javascript:window.close();" style="background: #3b82f6; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Sayfayı Kapat</a>
      </div>
    `;
  }
}
</script>
</body>
</html>