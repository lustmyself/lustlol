const CDN = "https://ddragon.leagueoflegends.com";

// Image URLs. Champion ids come from match data (championName) or the map above.
export const img = {
  profileIcon: (v: string, id: number) => `${CDN}/cdn/${v}/img/profileicon/${id}.png`,
  champion: (v: string, id: string) => `${CDN}/cdn/${v}/img/champion/${id}.png`,
  item: (v: string, id: number) => `${CDN}/cdn/${v}/img/item/${id}.png`,
  spell: (v: string, id: string) => `${CDN}/cdn/${v}/img/spell/${id}.png`,
  rune: (path: string) => `${CDN}/cdn/img/${path}`,
};
