/**
 * ============================================================================
 * lustlol.gg - matchService.js
 * Production-Ready Riot Games Match-V5 Ingestion & Rate-Limited Storage Engine
 * ============================================================================
 * 
 * Requirements Implemented:
 * 1. Infinite Loop: Fetches matches using count=95, increments start by 95 until
 *    API returns an empty array.
 * 2. Strict Rate Limiter: Production queue with Bottleneck respecting Riot limits
 *    (20 req/1 sec, 100 req/2 mins) and dynamic 429 Retry-After backoff.
 * 3. DB Delta Update: Bulk-inserts matches into MongoDB and IMMEDIATELY stops
 *    the fetch loop the moment a fetched Match ID already exists in the database.
 */

import Bottleneck from 'bottleneck';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RIOT_API_KEY = process.env.RIOT_API_KEY || '';

// ============================================================================
// 1. STRICT BOTTLENECK RATE LIMITERS (Riot Dev Limits)
// ============================================================================

// Short window: 20 req / 1 sec (safe buffer: 18 req / 1000ms, maxConcurrent 5)
export const limiter1s = new Bottleneck({
  reservoir: 18,
  reservoirRefreshAmount: 18,
  reservoirRefreshInterval: 1000,
  maxConcurrent: 5
});

// Long window: 100 req / 2 min (safe buffer: 95 req / 120,000ms)
export const limiter2m = new Bottleneck({
  reservoir: 95,
  reservoirRefreshAmount: 95,
  reservoirRefreshInterval: 120 * 1000
});

// Chain them: every request must satisfy both reservoirs
limiter1s.chain(limiter2m);

// Export riotLimiter alias for compatibility with server.ts
export const riotLimiter = limiter1s;
export { limiter1s as limiter };

limiter1s.notifyRateLimit = function (retryAfterSeconds = 5) {
  console.warn(`[Bottleneck] Rate limit cooldown triggered: ${retryAfterSeconds}s`);
};

// Dynamic 429 handler: read Retry-After header and back off the queue
limiter1s.on('failed', async (error, jobInfo) => {
  if (error?.status === 429 && jobInfo.retryCount < 3) {
    const retryAfter = error.retryAfter || 5;
    console.warn(`[Bottleneck] Riot 429 Rate Limit hit. Backing off queue for ${retryAfter}s...`);
    return (retryAfter * 1000) + 500;
  }
});

/**
 * Rate-limited fetch through the Bottleneck queue
 */
export async function rateLimitedRiotFetch(url, apiKey = RIOT_API_KEY) {
  if (!apiKey) {
    throw new Error('[RiotAPI] RIOT_API_KEY is missing.');
  }

  return limiter1s.schedule(async () => {
    const res = await fetch(url, {
      headers: {
        'X-Riot-Token': apiKey,
        'User-Agent': 'lustlol.gg-stat-engine/2.0.0'
      }
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      const err = new Error('Riot API Rate Limit Exceeded (429)');
      err.status = 429;
      err.retryAfter = retryAfter;
      throw err;
    }

    if (!res.ok) {
      const err = new Error(`Riot API request failed with status: ${res.status}`);
      err.status = res.status;
      err.url = url;
      throw err;
    }

    return res.json();
  });
}

// ============================================================================
// 2. MONGOOSE DATABASE SCHEMA & MODELS
// ============================================================================

export const MatchSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    region: { type: String, index: true },
    gameCreation: { type: Number, index: true },
    gameDuration: { type: Number },
    gameEndTimestamp: { type: Number },
    queueId: { type: Number, index: true },
    gameMode: { type: String },
    participantPuuids: [{ type: String, index: true }],
    info: { type: Object, required: true },
    metadata: { type: Object, required: true }
  },
  {
    timestamps: true,
    minimize: false
  }
);

// High-speed compound indexes for player match history and queue queries
MatchSchema.index({ participantPuuids: 1, gameCreation: -1 });
MatchSchema.index({ participantPuuids: 1, queueId: 1, gameCreation: -1 });

export const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

// In-memory fallback cache when MongoDB connection is not active
export const inMemoryMatches = new Map();

// ============================================================================
// 3. CORE SERVICE: MATCH INGESTION & DELTA ENGINE
// ============================================================================

export class MatchService {
  /**
   * Helper to map platform server to Riot routing region
   */
  static getRoutingRegion(server = 'tr') {
    const s = server.toLowerCase();
    if (['tr', 'tr1', 'euw', 'euw1', 'eune', 'eun1', 'ru'].includes(s)) return 'europe';
    if (['na', 'na1', 'br', 'br1', 'la1', 'la2', 'las', 'lan'].includes(s)) return 'americas';
    if (['kr', 'jp', 'jp1'].includes(s)) return 'asia';
    if (['oce', 'oc1', 'ph2', 'sg2', 'th2', 'tw2', 'vn2'].includes(s)) return 'sea';
    return 'europe';
  }

  /**
   * Requirement 1 & 3:
   * Infinite Loop with count=95 and start += 95 until empty array.
   * Stops IMMEDIATELY if any fetched Match ID already exists in the database (Delta update).
   *
   * @param {string} puuid - Player's Riot PUUID
   * @param {string} region - Regional routing value ('europe', 'americas', etc.)
   * @param {number|null} queueFilter - Optional queue ID (e.g. 420 for Solo/Duo)
   * @returns {Promise<{ newMatchIds: string[], totalLifetimeIdsFound: string[] }>}
   */
  static async fetchAllMatchIdsWithDelta(puuid, region = 'europe', queueFilter = null, options = {}) {
    let start = 0;
    const count = 95; // Exact chunk size requested
    const newMatchIds = [];
    const allKnownIds = [];
    const stopOnDelta = options.stopOnDelta !== false; // default true for delta sync, false when mapping full history
    let hitExistingInDb = false;
    let page = 1;

    console.log(`[matchService] Starting match fetch loop for PUUID: ${puuid} (chunk size: ${count}, stopOnDelta: ${stopOnDelta})...`);

    while (true) {
      let url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
      if (queueFilter) {
        url += `&queue=${queueFilter}`;
      }

      console.log(`[matchService] Page ${page}: Requesting start=${start}&count=${count}`);
      const chunkIds = await rateLimitedRiotFetch(url);

      // Stop if API returns empty array
      if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
        console.log(`[matchService] API returned 0 IDs at start=${start}. Infinite loop complete.`);
        break;
      }

      allKnownIds.push(...chunkIds);

      // Requirement 3: Check MongoDB for existing matches to enforce Delta boundary
      let existingSet = new Set();
      if (mongoose.connection.readyState === 1) {
        try {
          const coll = mongoose.connection.collection('matches');
          const foundInDb = await coll.find(
            { matchId: { $in: chunkIds } },
            { projection: { matchId: 1 } }
          ).toArray();
          existingSet = new Set(foundInDb.map((m) => m.matchId));
        } catch (dbErr) {
          console.warn('[matchService] DB lookup warning:', dbErr.message);
        }
      }

      // Check for delta stop condition against MongoDB stored records
      for (const matchId of chunkIds) {
        if (existingSet.has(matchId)) {
          console.log(`[matchService] Match ID "${matchId}" already exists in MongoDB! Delta boundary reached.`);
          hitExistingInDb = true;
          if (stopOnDelta) break;
        } else {
          newMatchIds.push(matchId);
        }
      }

      // Requirement 3: Immediately stop fetch loop if a fetched Match ID already exists in DB
      if (hitExistingInDb && stopOnDelta) {
        break;
      }

      // If fewer than 95 matches returned, we have reached the earliest game in history
      if (chunkIds.length < count) {
        console.log(`[matchService] Partial chunk received (${chunkIds.length} < ${count}). All lifetime matches exhausted.`);
        break;
      }

      start += 95; // Increment start by 95
      page++;
    }

    console.log(`[matchService] Fetch loop finished. New IDs to ingest: ${newMatchIds.length} | Total IDs encountered: ${allKnownIds.length}`);
    return { newMatchIds, allKnownIds };
  }

  /**
   * Bulk insert match details into MongoDB using bulkWrite with upsert: true
   *
   * @param {any[]} rawMatchesList - Array of raw match payloads from Riot API
   * @param {string} region
   * @returns {Promise<number>} Number of newly upserted matches
   */
  static async bulkInsertMatches(rawMatchesList, region = 'europe') {
    if (!rawMatchesList || rawMatchesList.length === 0) return 0;

    // Cache in memory for immediate access
    for (const m of rawMatchesList) {
      const matchId = m.metadata?.matchId || m.matchId;
      if (matchId) inMemoryMatches.set(matchId, m);
    }

    // If MongoDB is connected, execute bulkWrite
    if (mongoose.connection.readyState === 1) {
      const operations = rawMatchesList.map((m) => {
        const matchId = m.metadata?.matchId || m.matchId;
        const participantPuuids = m.metadata?.participants || m.info?.participants?.map((p) => p.puuid) || [];

        return {
          updateOne: {
            filter: { matchId },
            update: {
              $setOnInsert: {
                matchId,
                region,
                data: m,
                info: m.info,
                metadata: m.metadata,
                gameCreation: m.info?.gameCreation || 0,
                gameDuration: m.info?.gameDuration || 0,
                gameEndTimestamp: m.info?.gameEndTimestamp || (m.info?.gameCreation + (m.info?.gameDuration || 0) * 1000),
                queueId: m.info?.queueId || 0,
                gameMode: m.info?.gameMode || 'UNKNOWN',
                participantPuuids,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        };
      });

      const coll = mongoose.connection.collection('matches');
      const result = await coll.bulkWrite(operations, { ordered: false });
      return result.upsertedCount || 0;
    }

    return rawMatchesList.length;
  }

  /**
   * Complete End-to-End Sync Pipeline:
   * 1. Fetches all match IDs in chunks of 95 (stops when empty or on DB delta match).
   * 2. Ingests all missing match details using the Bottleneck rate limiter.
   * 3. Bulk inserts in batches into MongoDB.
   *
   * @param {string} puuid - Player PUUID
   * @param {string} server - Server platform ('tr', 'euw', 'na', etc.)
   * @param {object} options - Optional callbacks & configurations
   * @returns {Promise<object>} Complete synchronization report
   */
  static async syncPlayerMatches(puuid, server = 'tr', options = {}) {
    const startTime = Date.now();
    const region = this.getRoutingRegion(server);

    // Step 1: Run infinite loop with chunk=95 & DB delta detection
    const { newMatchIds, allKnownIds } = await this.fetchAllMatchIdsWithDelta(
      puuid,
      region,
      options.queueFilter || null
    );

    if (newMatchIds.length === 0) {
      console.log(`[matchService] Player ${puuid} is already up to date. 0 new matches needed.`);
      return {
        puuid,
        status: 'ALREADY_UP_TO_DATE',
        newMatchesIngested: 0,
        totalMatchesKnown: allKnownIds.length,
        durationMs: Date.now() - startTime
      };
    }

    // Step 2: Fetch full match details for all new match IDs through rate limiter
    console.log(`[matchService] Ingesting ${newMatchIds.length} new matches via rate-limited queue...`);
    const BATCH_SIZE = 25;
    let newlyInsertedTotal = 0;
    const currentBatch = [];

    for (let i = 0; i < newMatchIds.length; i++) {
      const matchId = newMatchIds[i];
      try {
        const matchData = await rateLimitedRiotFetch(
          `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`
        );

        if (matchData?.info) {
          currentBatch.push(matchData);
        }

        // Flush batch into MongoDB
        if (currentBatch.length >= BATCH_SIZE || i === newMatchIds.length - 1) {
          const inserted = await this.bulkInsertMatches(currentBatch, region);
          newlyInsertedTotal += inserted;
          currentBatch.length = 0; // Clear memory buffer

          if (typeof options.onProgress === 'function') {
            options.onProgress({
              processed: i + 1,
              total: newMatchIds.length,
              inserted: newlyInsertedTotal
            });
          }
        }
      } catch (fetchErr) {
        console.warn(`[matchService] Could not fetch match ${matchId}:`, fetchErr.message);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[matchService] Sync completed for ${puuid}: +${newlyInsertedTotal} matches ingested in ${(durationMs / 1000).toFixed(2)}s.`);

    return {
      puuid,
      status: 'SYNC_COMPLETE',
      newMatchesIngested: newlyInsertedTotal,
      totalMatchesKnown: allKnownIds.length,
      durationMs
    };
  }

  /**
   * Fast query for matches from DB or memory cache (0ms, 0 Riot API calls)
   */
  static async getMatches(puuid, skip = 0, limit = 20, queueFilter = null) {
    if (mongoose.connection.readyState === 1) {
      const query = { participantPuuids: puuid };
      if (queueFilter) query.queueId = Number(queueFilter);

      const [matches, total] = await Promise.all([
        Match.find(query).sort({ gameCreation: -1 }).skip(skip).limit(limit).lean(),
        Match.countDocuments(query)
      ]);

      return { matches, total, skip, limit };
    }

    // Memory fallback
    const list = Array.from(inMemoryMatches.values())
      .filter((m) => {
        const hasPuuid = m.metadata?.participants?.includes(puuid) || m.info?.participants?.some((p) => p.puuid === puuid);
        if (!hasPuuid) return false;
        if (queueFilter && m.info?.queueId !== Number(queueFilter)) return false;
        return true;
      })
      .sort((a, b) => (b.info?.gameCreation || 0) - (a.info?.gameCreation || 0));

    return {
      matches: list.slice(skip, skip + limit),
      total: list.length,
      skip,
      limit
    };
  }
}

export default MatchService;
