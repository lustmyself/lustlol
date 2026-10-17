import "server-only";

const CDN = "https://ddragon.leagueoflegends.com";
const DAY = 60 * 60 * 24;

export interface StaticData {
  version: string;
  /** champion numeric key -> { id: "MonkeyKing", name: "Wukong" } */
  champions: Record<number, { id: string; name: string }>;
  /** summoner spell numeric key -> image file id */
  spells: Record<number, string>;
  /** rune style / perk id -> icon path */
  runes: Record<number, string>;
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: DAY / 4 } });
  if (!res.ok) throw new Error(`Data Dragon ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function latestVersion(): Promise<string> {
  try {
    const versions = await json<string[]>(`${CDN}/api/versions.json`);
    return versions[0];
  } catch {
    return "16.17.1";
  }
}

export async function getStaticData(): Promise<StaticData> {
  const version = await latestVersion();
  const base = `${CDN}/cdn/${version}/data/en_US`;

  const [champJson, spellJson, runeJson] = await Promise.all([
    json<{ data: Record<string, { id: string; key: string; name: string }> }>(`${base}/champion.json`),
    json<{ data: Record<string, { key: string; id: string }> }>(`${base}/summoner.json`),
    json<{ id: number; icon: string; slots: { runes: { id: number; icon: string }[] }[] }[]>(
      `${base}/runesReforged.json`,
    ),
  ]).catch(() => [{ data: {} }, { data: {} }, []] as const);

  const champions: StaticData["champions"] = {};
  for (const c of Object.values(champJson.data)) champions[Number(c.key)] = { id: c.id, name: c.name };

  const spells: StaticData["spells"] = {};
  for (const s of Object.values(spellJson.data)) spells[Number(s.key)] = s.id;

  const runes: StaticData["runes"] = {};
  for (const style of runeJson) {
    runes[style.id] = style.icon;
    for (const slot of style.slots) for (const r of slot.runes) runes[r.id] = r.icon;
  }

  return { version, champions, spells, runes };
}
