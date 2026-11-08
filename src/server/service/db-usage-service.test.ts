import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDbUsage,
  clearDbUsageCache,
  setMockDbUsageCache,
  DB_STATS_TTL_MS,
  type DbUsageStats,
} from './db-usage-service.ts';

describe('Database Usage Service Caching', () => {
  beforeEach(() => {
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

  it('should clear cache when clearDbUsageCache is invoked', async () => {
    const mockStats: DbUsageStats = {
      size: '2.50 MB',
      rawSize: 2621440,
      collections: 3,
      objects: 100,
    };

    setMockDbUsageCache(mockStats, Date.now());
    clearDbUsageCache();

    // Since cache is cleared and no DB env is provided, it should attempt to connect and throw
    const originalUri = process.env.MONGODB_URI;
    const originalCluster = process.env.MONGODB_ATLAS_CLUSTER_URL;
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_ATLAS_CLUSTER_URL;

    try {
      await assert.rejects(async () => {
        await getDbUsage();
      }, /MongoDB configuration error/);
    } finally {
      process.env.MONGODB_URI = originalUri;
      process.env.MONGODB_ATLAS_CLUSTER_URL = originalCluster;
    }
  });

  it('should fall back to stale cache if refresh encounters connection error', async () => {
    const staleStats: DbUsageStats = {
      size: '0.80 MB',
      rawSize: 838860,
      collections: 2,
      objects: 20,
    };

    // Stale timestamp (older than 5 minutes)
    setMockDbUsageCache(staleStats, Date.now() - 600000);

    const originalUri = process.env.MONGODB_URI;
    const originalCluster = process.env.MONGODB_ATLAS_CLUSTER_URL;
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_ATLAS_CLUSTER_URL;

    try {
      const fallbackResult = await getDbUsage();
      assert.deepStrictEqual(fallbackResult, staleStats);
    } finally {
      process.env.MONGODB_URI = originalUri;
      process.env.MONGODB_ATLAS_CLUSTER_URL = originalCluster;
    }
  });
});
