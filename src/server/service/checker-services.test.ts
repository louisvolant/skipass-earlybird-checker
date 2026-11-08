import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from '../config/mongoose.ts';
import { getCheckList, getCheckContent, deleteCheckContent } from './checker-history-service.ts';
import { getConfigurations, updateConfiguration } from './checker-configuration-service.ts';

describe('Checker Services Mongoose Optimizations', () => {
  it('should register CheckerContentModel with lean query capability', () => {
    const model = mongoose.models.checker_content;
    assert.ok(model, 'checker_content model should be defined in mongoose.models');

    // Verify model query builder supports lean and limits
    const query = model.find({}).select('-response_text').limit(50).lean();
    assert.ok(query, 'query with lean() and limit() should be constructed');
    assert.strictEqual(typeof query.then, 'function');
  });

  it('should register ActiveConfigurationModel with lean query capability', () => {
    const model = mongoose.models.checker_configuration;
    assert.ok(model, 'checker_configuration model should be defined in mongoose.models');

    const query = model.find({ is_active: true }).lean();
    assert.ok(query, 'active configuration query with lean() should be constructed');
    assert.strictEqual(typeof query.then, 'function');
  });

  it('should export all required service methods', () => {
    assert.strictEqual(typeof getCheckList, 'function');
    assert.strictEqual(typeof getCheckContent, 'function');
    assert.strictEqual(typeof deleteCheckContent, 'function');
    assert.strictEqual(typeof getConfigurations, 'function');
    assert.strictEqual(typeof updateConfiguration, 'function');
  });

  it('should propagate errors cleanly if DB connection is unavailable', async () => {
    const originalUri = process.env.MONGODB_URI;
    const originalCluster = process.env.MONGODB_ATLAS_CLUSTER_URL;
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_ATLAS_CLUSTER_URL;

    try {
      await assert.rejects(async () => {
        await getCheckList();
      }, /MongoDB configuration error/);
    } finally {
      process.env.MONGODB_URI = originalUri;
      process.env.MONGODB_ATLAS_CLUSTER_URL = originalCluster;
    }
  });
});
