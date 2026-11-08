import { connectDB } from '../config/mongoose.ts';

export interface DbUsageStats {
  size: string;
  rawSize: number;
  collections: number;
  objects: number;
}

interface CacheEntry {
  data: DbUsageStats;
  timestamp: number;
}

// 5-minute TTL for in-memory database usage cache to save compute cycles on Cloudflare Workers
export const DB_STATS_TTL_MS = 5 * 60 * 1000;
let cachedDbUsage: CacheEntry | null = null;

export function clearDbUsageCache() {
  cachedDbUsage = null;
}

export function setMockDbUsageCache(data: DbUsageStats, timestamp = Date.now()) {
  cachedDbUsage = { data, timestamp };
}

/**
 * Retrieve database storage statistics with in-memory caching to avoid
 * expensive db.stats() calls on every dashboard page visit.
 */
export async function getDbUsage(forceRefresh = false): Promise<DbUsageStats> {
  const now = Date.now();
  if (!forceRefresh && cachedDbUsage && now - cachedDbUsage.timestamp < DB_STATS_TTL_MS) {
    console.info('Serving DB usage from in-memory cache');
    return cachedDbUsage.data;
  }

  try {
    const connection = await connectDB();
    const db = connection.db;

    if (!db) {
      throw new Error('No MongoDB database connection available');
    }

    const stats = await db.stats();
    const sizeInMB = (stats.dataSize / (1024 * 1024)).toFixed(2);

    const result: DbUsageStats = {
      size: `${sizeInMB} MB`,
      rawSize: stats.dataSize,
      collections: stats.collections,
      objects: stats.objects,
    };

    cachedDbUsage = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error('Error fetching DB usage:', error);
    // Serve stale cache if available when database call encounters an issue
    if (cachedDbUsage) {
      console.warn('Falling back to stale DB usage cache on error');
      return cachedDbUsage.data;
    }
    throw error;
  }
}
