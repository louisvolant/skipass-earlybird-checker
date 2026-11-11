import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDbUsage,
  clearDbUsageCache,
  setMockDbUsageCache,
  DB_STATS_TTL_MS,
  type DbUsageStats,
} from './db-usage-service.ts';
import { resetInMemoryD1Database, setMockD1Database } from '../db/d1.ts';

describe('Database Usage Service Caching', () => {
  beforeEach(() => {
    setMockD1Database(null);
    resetInMemoryD1Database();
    clearDbUsageCache();
  });

  it('should export correct cache TTL constant', () => {
    assert.strictEqual(DB_STATS_TTL_MS, 300000, 'TTL should be 5 minutes (300,000 ms)');
  });

  it('should return cached stats without database query when cache is warm', async () => {
    const mockStats: DbUsageStats = {
      size: '1.25 MB',
      rawSize: 1310720,
      collections: 2,
      objects: 45,
    };

    setMockDbUsageCache(mockStats, Date.now());

    const result = await getDbUsage();
    assert.deepStrictEqual(result, mockStats);
    assert.strictEqual(result.size, '1.25 MB');
    assert.strictEqual(result.collections, 2);
  });

  it('should compute D1 statistics when cache is cold', async () => {
    const stats = await getDbUsage();
    assert.ok(stats.size);
    assert.ok(stats.rawSize > 0);
    assert.strictEqual(stats.collections, 2);
    assert.ok(stats.objects >= 1); // at least 1 seeded configuration
  });

  it('should clear cache when clearDbUsageCache is invoked', async () => {
    const mockStats: DbUsageStats = {
      size: '2.50 MB',
      rawSize: 2621440,
      collections: 3,
      objects: 100,
    };

    setMockDbUsageCache(mockStats, Date.now());
    clearDbUsageCache();

    // Cache should be refreshed from D1
    const refreshed = await getDbUsage();
    assert.notDeepStrictEqual(refreshed, mockStats);
    assert.strictEqual(refreshed.collections, 2);
  });

  it('should fall back to stale cache if refresh encounters database error', async () => {
    const staleStats: DbUsageStats = {
      size: '0.80 MB',
      rawSize: 838860,
      collections: 2,
      objects: 20,
    };

    // Stale timestamp (older than 5 minutes)
    setMockDbUsageCache(staleStats, Date.now() - 600000);

    setMockD1Database({
      prepare() {
        throw new Error('Simulated D1 failure');
      },
      batch() {
        throw new Error('Simulated D1 failure');
      },
      exec() {
        throw new Error('Simulated D1 failure');
      },
    });

    const fallbackResult = await getDbUsage();
    assert.deepStrictEqual(fallbackResult, staleStats);
  });
});
