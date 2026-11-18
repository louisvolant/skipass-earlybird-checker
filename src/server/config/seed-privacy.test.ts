// src/server/config/seed-privacy.test.ts
// Guards the committed D1 seed migration against personally identifiable data.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Seed Migration Privacy', () => {
  it('should only contain placeholder recipient data (no customer PII)', () => {
    const sql = fs.readFileSync(path.resolve('migrations/0002_seed_configurations.sql'), 'utf-8');

    // Alert recipients are customer PII: the seed must never carry real
    // names or email addresses since it is committed to source control.
    assert.ok(sql.includes('alerts@example.com'), 'seed should use the placeholder alerts@example.com');
    const nonPlaceholderEmail = /@(?!example\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    assert.strictEqual(
      nonPlaceholderEmail.test(sql),
      false,
      'seed migration must not contain real email addresses'
    );
  });

  it('must not overwrite existing configurations when re-run (ON CONFLICT DO NOTHING)', () => {
    const sql = fs.readFileSync(path.resolve('migrations/0002_seed_configurations.sql'), 'utf-8');
    // Re-running the seed on an existing deployment must never clobber the
    // real alert recipients configured by customers.
    assert.ok(/ON CONFLICT\(id\)\s+DO NOTHING/i.test(sql));
  });
});
