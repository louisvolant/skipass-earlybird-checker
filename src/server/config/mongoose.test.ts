import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose, { buildUri } from './mongoose.ts';

describe('Mongoose Configuration (Mongoose v9)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_ATLAS_USERNAME;
    delete process.env.MONGODB_ATLAS_PASSWORD;
    delete process.env.MONGODB_ATLAS_CLUSTER_URL;
    delete process.env.MONGODB_ATLAS_DB_NAME;
    delete process.env.MONGODB_ATLAS_APP_NAME;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should export valid Mongoose instance', () => {
    assert.ok(mongoose, 'mongoose instance should be exported');
    assert.strictEqual(typeof mongoose.connect, 'function');
    assert.strictEqual(typeof mongoose.model, 'function');
  });

  it('should use MONGODB_URI directly if provided', () => {
    process.env.MONGODB_URI = 'mongodb://custom-host:27017/test_db';
    const uri = buildUri();
    assert.strictEqual(uri, 'mongodb://custom-host:27017/test_db');
  });

  it('should build connection string from Atlas environment variables', () => {
    process.env.MONGODB_ATLAS_USERNAME = 'mockuser';
    process.env.MONGODB_ATLAS_PASSWORD = 'mockpassword';
    process.env.MONGODB_ATLAS_CLUSTER_URL = 'cluster.example.com';
    process.env.MONGODB_ATLAS_DB_NAME = 'mock_db';
    process.env.MONGODB_ATLAS_APP_NAME = 'MockCluster';

    const uri = buildUri();
    assert.ok(uri.startsWith('mongodb+srv://mockuser:mockpassword@cluster.example.com/mock_db'));
    assert.ok(uri.includes('appName=MockCluster'));
  });

  it('should throw if neither MONGODB_URI nor MONGODB_ATLAS_CLUSTER_URL is configured', () => {
    assert.throws(
      () => buildUri(),
      /MongoDB configuration error: MONGODB_URI or MONGODB_ATLAS_CLUSTER_URL is required/
    );
  });
});
