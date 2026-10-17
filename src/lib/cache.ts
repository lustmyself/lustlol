import "server-only";
import { MongoClient, type Collection } from "mongodb";

/** Small in-process TTL cache with a size cap; oldest entries go first. */
export class MemoryCache<T> {
  private map = new Map<string, { value: T; expires: number }>();
  constructor(
    private ttlMs: number,
    private max = 500,
  ) {}

  get(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }

  delete(key: string) {
    this.map.delete(key);
  }

  deleteWhere(test: (key: string) => boolean) {
    for (const key of [...this.map.keys()]) if (test(key)) this.map.delete(key);
  }

  values(): T[] {
    const now = Date.now();
    return [...this.map.values()].filter((e) => e.expires >= now).map((e) => e.value);
  }
}

/** Runs `load` once per key at a time and caches the result. */
const inflight = new WeakMap<MemoryCache<unknown>, Map<string, Promise<unknown>>>();

export async function cached<T>(cache: MemoryCache<T>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let pending = inflight.get(cache);
  if (!pending) inflight.set(cache, (pending = new Map()));
  const running = pending.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = load()
    .then((value) => {
      cache.set(key, value);
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

// MongoDB is optional: with MONGO_URI set, finished matches are kept there too.
let collectionPromise: Promise<Collection | null> | null = null;

export function mongoCollection(name: string): Promise<Collection | null> {
  const uri = process.env.MONGO_URI;
  if (!uri) return Promise.resolve(null);
  collectionPromise ??= new MongoClient(uri, { serverSelectionTimeoutMS: 4000 })
    .connect()
    .then((client) => client.db().collection("_probe"))
    .catch((err) => {
      console.warn("MongoDB unavailable, using memory cache only:", err.message);
      // Try again in a minute instead of staying on memory until a restart.
      setTimeout(() => (collectionPromise = null), 60_000);
      return null;
    });
  return collectionPromise.then((probe) => (probe ? probe.db.collection(name) : null));
}
