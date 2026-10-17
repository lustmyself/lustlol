import "server-only";
import * as cheerio from "cheerio";

const SITE = "https://www.leagueoflegends.com";

export type ChangeKind = "buff" | "nerf" | "adjusted";

export interface PatchChange {
  name: string;
  /** Data Dragon image url Riot put next to the change, if any. */
  image: string | null;
  context: string;
  kind: ChangeKind;
  groups: { title: string; lines: string[] }[];
}

export interface PatchNotes {
  version: string;
  url: string;
  champions: PatchChange[];
  items: PatchChange[];
}

// For these stats a lower number is better for the player.
const LOWER_IS_BETTER = /cooldown|cost|delay|cast time|lockout|recharge time|channel time/i;

function lineDirection(line: string): number {
  const [label, change] = line.split(/:(.+)/);
  if (!change?.includes("⇒")) return 0;
  const [before, after] = change.split("⇒");
  const nums = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const a = nums(before);
  const b = nums(after);
  if (!a.length || !b.length) return 0;
  // "5 - 30 (+25% AD) ⇒ 5 - 25 (+20% AD)": compare value by value, not just the first.
  // "2.5s ⇒ 2.5 / 2.75 / 3s": a single value stands for every rank.
  const n = a.length === 1 || b.length === 1 ? Math.max(a.length, b.length) : Math.min(a.length, b.length);
  const at = (xs: number[], i: number) => (xs.length === 1 ? xs[0] : xs[i]);
  let up = 0;
  for (let i = 0; i < n; i++) up += Math.sign(at(b, i) - at(a, i));
  up = Math.sign(up);
  return LOWER_IS_BETTER.test(label) ? -up : up;
}

function classify(lines: string[]): ChangeKind {
  let score = 0;
  let signals = 0;
  for (const line of lines) {
    const d = lineDirection(line);
    if (d !== 0) signals++;
    score += d;
  }
  if (signals === 0) return "adjusted";
  if (score >= Math.ceil(signals / 2)) return "buff";
  if (score <= -Math.ceil(signals / 2)) return "nerf";
  return "adjusted";
}

async function page(url: string): Promise<string> {
  const res = await fetch(url, { next: { revalidate: 60 * 30 } });
  if (!res.ok) throw new Error(`Patch notes ${res.status}`);
  return res.text();
}

export async function latestPatchUrl(): Promise<string> {
  const html = await page(`${SITE}/en-us/news/tags/patch-notes/`);
  const m = html.match(/\/en-us\/news\/game-updates\/[a-z0-9-]*patch-\d+-\d+-notes/);
  if (!m) throw new Error("No patch notes link found");
  return SITE + m[0];
}

function readSection($: cheerio.CheerioAPI, id: string): PatchChange[] {
  const header = $(`h2#${id}`).closest("header");
  const blocks = header.nextUntil("header").find(".patch-change-block");

  return blocks
    .map((_, block) => {
      const b = $(block);
      const name = b.find("h3.change-title").first().text().trim();
      if (!name) return null;

      const src = b.find("p img").first().attr("src") ?? "";
      const image = src.includes("f=") ? decodeURIComponent(src.split("f=")[1]) : src || null;
      const groups: PatchChange["groups"] = [];
      b.find("h4.change-detail-title").each((_, h4) => {
        const lines = $(h4)
          .nextUntil("h4, hr")
          .filter("ul")
          .find("li")
          .map((_, li) => $(li).text().replace(/\s+/g, " ").trim())
          .get();
        groups.push({ title: $(h4).text().trim(), lines });
      });

      return {
        name,
        image,
        context: b.find("blockquote").first().text().trim(),
        kind: classify(groups.flatMap((g) => g.lines)),
        groups,
      } satisfies PatchChange;
    })
    .get()
    .filter(Boolean) as PatchChange[];
}

export async function getPatchNotes(): Promise<PatchNotes> {
  const url = await latestPatchUrl();
  const $ = cheerio.load(await page(url));
  const version = (url.match(/patch-(\d+)-(\d+)-notes/) ?? []).slice(1, 3).join(".");
  return {
    version,
    url,
    champions: readSection($, "patch-champions"),
    items: readSection($, "patch-items"),
  };
}
