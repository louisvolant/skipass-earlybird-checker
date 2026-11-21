// src/server/service/skipass-resort-call.http.test.ts
// Integration test for the crawler HTTP layer with a mocked axios client.
// Verifies that TLS certificate verification is never disabled.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import axios from 'axios';

// Environment must be set before importing the service module: the resort URLs
// are captured at module load time.
process.env.BASE_SKI_RESORT_URL = 'https://www.resort-example.com';
process.env.BASE_SKI_RESORT_URL_SHOP = 'https://shop.resort-example.com/search';

const { resetInMemoryD1Database } = await import('../db/d1.ts');
const { checkSkiPassStation } = await import('./skipass-resort-call.ts');

describe('Resort Crawler HTTP Requests', () => {
  it('should perform requests with TLS verification enabled (no custom httpsAgent)', async () => {
    // Seed exactly one active configuration into the in-memory D1 harness
    // (clearing the baseline seed first).
    const db = resetInMemoryD1Database();
    await db.prepare('DELETE FROM checker_configurations').run();
    await db
      .prepare(
        `INSERT INTO checker_configurations (is_active, target_date, target_label, is_mail_alert)
         VALUES (1, '2026-12-20', 'Pass Saison EarlyBird 2026/2027', 0)`
      )
      .run();

    let capturedUrl = '';
    let capturedConfig: Record<string, unknown> | undefined;
    const getMock = mock.method(axios, 'get', async (requestUrl: string, config?: Record<string, unknown>) => {
      capturedUrl = requestUrl;
      capturedConfig = config;
      return {
        status: 200,
        data: `
          <div class="product-row">
            <a class="product-row__link" href="/deal-1">Pass Saison EarlyBird 2026/2027</a>
            <div class="product-action"><span class="button__text">Acheter €399</span></div>
          </div>
        `,
      };
    });

    try {
      const results = await checkSkiPassStation();
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].found, true);
      assert.strictEqual(results[0].price, '399');
      assert.strictEqual(capturedUrl, 'https://shop.resort-example.com/search');

      // TLS certificate verification must never be disabled: no custom
      // httpsAgent (rejectUnauthorized: false) may be attached to requests.
      assert.strictEqual(capturedConfig?.httpsAgent, undefined, 'httpsAgent must not be set on crawler requests');
      assert.strictEqual(capturedConfig?.signal, undefined);
    } finally {
      getMock.mock.restore();
    }
  });

  it('should use per-configuration target_url when configured', async () => {
    const db = resetInMemoryD1Database();
    await db.prepare('DELETE FROM checker_configurations').run();
    await db
      .prepare(
        `INSERT INTO checker_configurations (is_active, target_date, target_label, target_url, is_mail_alert)
         VALUES (1, '2026-12-20', 'Custom Resort Pass', 'https://custom-resort.example.com/shop', 0)`
      )
      .run();

    let capturedUrl = '';
    const getMock = mock.method(axios, 'get', async (requestUrl: string) => {
      capturedUrl = requestUrl;
      return {
        status: 200,
        data: `
          <div class="product-row">
            <a class="product-row__link" href="/deal">Custom Resort Pass</a>
            <div class="product-action"><span class="button__text">Acheter €299</span></div>
          </div>
        `,
      };
    });

    try {
      const results = await checkSkiPassStation();
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].found, true);
      assert.strictEqual(results[0].price, '299');
      assert.strictEqual(capturedUrl, 'https://custom-resort.example.com/shop');
    } finally {
      getMock.mock.restore();
    }
  });
});
