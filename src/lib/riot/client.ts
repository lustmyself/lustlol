import "server-only";

export class RiotError extends Error {
  constructor(
    public status: number,
    public code: "no_key" | "bad_key" | "not_found" | "rate_limited" | "unavailable",
  ) {
    super(`Riot API ${status} (${code})`);
  }
}

/**
 * Sliding-window limiter shared by every request in this process.
 * Riot enforces several windows at once (a development key is 20/1s and 100/2min),
 * so a request waits until it fits in all of them.
 */
const windows = (process.env.RIOT_RATE_LIMITS || "20:1,100:120").split(",").map((pair) => {
  const [count, seconds] = pair.split(":").map(Number);
  return { count, ms: seconds * 1000, stamps: [] as number[] };
});

export type Priority = "high" | "low";

// Page loads ("high") may use the whole budget. Background work ("low") stops at
// LOW_SHARE of every window so a visitor's request never waits behind a sync.
const LOW_SHARE = 0.6;
const lanes: Record<Priority, Promise<void>> = { high: Promise.resolve(), low: Promise.resolve() };
let pausedUntil = 0;

function acquire(priority: Priority): Promise<void> {
  const share = priority === "low" ? LOW_SHARE : 1;
  const turn = lanes[priority].then(async () => {
    for (;;) {
      const now = Date.now();
      let wait = Math.max(0, pausedUntil - now);
      for (const w of windows) {
        w.stamps = w.stamps.filter((t) => now - t < w.ms);
        const cap = Math.max(1, Math.floor(w.count * share));
        if (w.stamps.length >= cap) wait = Math.max(wait, w.stamps[w.stamps.length - cap] + w.ms - now);
      }
      if (wait === 0) break;
      await new Promise((r) => setTimeout(r, wait + 20));
    }
    const now = Date.now();
    for (const w of windows) w.stamps.push(now);
  });
  lanes[priority] = turn.catch(() => {});
  return turn;
}

export function hasRiotKey(): boolean {
  return Boolean(process.env.RIOT_API_KEY);
}

export async function riot<T>(host: string, path: string, priority: Priority = "high", retries = 2): Promise<T> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new RiotError(401, "no_key");

  for (let attempt = 0; ; attempt++) {
    await acquire(priority);
    let res: Response;
    try {
      res = await fetch(`https://${host}.api.riotgames.com${path}`, {
        headers: { "X-Riot-Token": key },
        cache: "no-store",
      });
    } catch {
      if (attempt < retries) continue;
      throw new RiotError(503, "unavailable");
    }

    if (res.ok) return (await res.json()) as T;

    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("Retry-After") || 2);
      pausedUntil = Date.now() + retryAfter * 1000;
      continue;
    }
    if (res.status >= 500 && attempt < retries) continue;

    if (res.status === 401 || res.status === 403) throw new RiotError(res.status, "bad_key");
    if (res.status === 404) throw new RiotError(404, "not_found");
    if (res.status === 429) throw new RiotError(429, "rate_limited");
    throw new RiotError(res.status, "unavailable");
  }
}
