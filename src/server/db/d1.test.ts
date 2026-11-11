import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDatabase,
  resetInMemoryD1Database,
  setMockD1Database,
  type D1Database,
} from './d1.ts';

describe('Cloudflare D1 Database Abstraction & In-Memory Test Harness', () => {
  beforeEach(() => {
    setMockD1Database(null);
    resetInMemoryD1Database();
  });

  it('should return a valid D1Database instance with schema and seed data', async () => {
    const db = getDatabase();
    assert.ok(db, 'db must be defined');
    assert.strictEqual(typeof db.prepare, 'function');

    const config = await db
      .prepare('SELECT * FROM checker_configurations WHERE id = ?')
      .bind(1)
      .first<{ id: number; target_label: string }>();

    assert.ok(config);
    assert.strictEqual(config.id, 1);
    assert.strictEqual(config.target_label, 'Val Cenis');
  });

  it('should support insert, update, and delete queries with run() and all()', async () => {
    const db = getDatabase();

    // Insert history record
    const insertRes = await db
      .prepare(`
        INSERT INTO checker_history (http_code, full_url, target_date, target_label, price, response_text)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind('200', 'https://example.com/resort', '2026-12-25', 'Val Cenis Christmas', 45.0, '<html>OK</html>')
      .run();

    assert.strictEqual(insertRes.success, true);

    // Retrieve inserted record
    const historyList = await db
      .prepare('SELECT * FROM checker_history WHERE target_label = ?')
      .bind('Val Cenis Christmas')
      .all<{ id: number; price: number; target_label: string }>();

    assert.strictEqual(historyList.results.length, 1);
    assert.strictEqual(historyList.results[0].price, 45.0);

    // Delete record
    const delRes = await db
      .prepare('DELETE FROM checker_history WHERE id = ?')
      .bind(historyList.results[0].id)
      .run();

    assert.strictEqual(delRes.success, true);

    // Verify deletion
    const verifyEmpty = await db
      .prepare('SELECT * FROM checker_history WHERE id = ?')
      .bind(historyList.results[0].id)
      .first();

    assert.strictEqual(verifyEmpty, null);
  });

  it('should support batch statements and exec', async () => {
    const db = getDatabase();

    await db.exec('CREATE TABLE test_batch (num INT);');

    const batchRes = await db.batch([
      db.prepare('INSERT INTO test_batch VALUES (?)').bind(10),
      db.prepare('INSERT INTO test_batch VALUES (?)').bind(20),
      db.prepare('SELECT * FROM test_batch'),
    ]);

    assert.strictEqual(batchRes.length, 3);
    const selectRes = batchRes[2];
    assert.strictEqual(selectRes.results.length, 2);
  });

  it('should allow setting custom mock D1 database', async () => {
    let customCalled = false;
    const mockDb: D1Database = {
      prepare: (query: string) => ({
        bind: () => mockDb.prepare(query),
        first: async () => {
          customCalled = true;
          return { custom: true };
        },
        all: async () => ({ results: [], success: true, meta: {} }),
        run: async () => ({ success: true, meta: {} }),
      }),
      batch: async () => [],
      exec: async () => ({ count: 1, duration: 0 }),
    };

    setMockD1Database(mockDb);
    const db = getDatabase();
    const res = await db.prepare('SELECT 1').first();
    assert.strictEqual(customCalled, true);
    assert.deepStrictEqual(res, { custom: true });
  });
});
