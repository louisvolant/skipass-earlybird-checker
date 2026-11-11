// src/server/service/db-usage-service.ts
// Cloudflare D1 storage usage metrics with in-memory TTL caching.

import { getDatabase } from '../db/d1.ts';

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
 * expensive queries on every dashboard page visit.
 */
export async function getDbUsage(forceRefresh = false): Promise<DbUsageStats> {
  const now = Date.now();
  if (!forceRefresh && cachedDbUsage && now - cachedDbUsage.timestamp < DB_STATS_TTL_MS) {
    console.info('Serving DB usage from in-memory cache');
    return cachedDbUsage.data;
  }

  try {
    const db = getDatabase();

    // Query user tables count
    const tablesRow = await db
      .prepare(
        "SELECT COUNT(*) AS total_tables FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';"
      )
      .first<{ total_tables: number }>();
    const totalTables = tablesRow?.total_tables ?? 2;

    // Query row counts and estimated storage size
    const statsRow = await db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM checker_configurations) AS config_count,
          (SELECT COUNT(*) FROM checker_history) AS history_count,
          (SELECT COALESCE(SUM(LENGTH(response_text) + LENGTH(full_url) + LENGTH(target_label) + 128), 0) FROM checker_history) AS history_bytes,
          (SELECT COALESCE(SUM(LENGTH(target_label) + LENGTH(mail_alert_address) + 128), 0) FROM checker_configurations) AS config_bytes
      `)
      .first<{
        config_count: number;
        history_count: number;
        history_bytes: number;
        config_bytes: number;
      }>();

    const configCount = Number(statsRow?.config_count ?? 0);
    const historyCount = Number(statsRow?.history_count ?? 0);
    const totalObjects = configCount + historyCount;

    const rawBytes = Math.max(
      4096,
      Number(statsRow?.history_bytes ?? 0) + Number(statsRow?.config_bytes ?? 0)
    );
    const sizeInMB = (rawBytes / (1024 * 1024)).toFixed(2);

    const result: DbUsageStats = {
      size: `${sizeInMB} MB`,
      rawSize: rawBytes,
      collections: totalTables,
      objects: totalObjects,
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
