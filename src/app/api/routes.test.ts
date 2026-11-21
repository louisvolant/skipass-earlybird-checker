import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { GET as getChecksRoute } from './get-checks/route.ts';
import { GET as getCheckerConfigRoute } from './get-checker-configuration/route.ts';
import { GET as getCheckContentRoute } from './get-check-content/route.ts';
import { GET as getDbUsageRoute } from './get-db-usage/route.ts';
import { POST as clearCacheRoute } from './clear-cache/route.ts';
import { GET as schedulerRoute } from './scheduler/route.ts';
import { POST as deleteCheckContentRoute } from './delete-check-content/route.ts';
import { POST as updateCheckerConfigRoute } from './update-checker-configuration/route.ts';
import { POST as createCheckerConfigRoute } from './create-checker-configuration/route.ts';
import { POST as deleteCheckerConfigRoute } from './delete-checker-configuration/route.ts';
import { POST as forceCheckRoute } from './force-check/route.ts';

describe('API Route Handlers and Edge Caching', () => {
  it('GET /api/get-checks should attach private browser cache headers', async () => {
    const response = await getChecksRoute();
    assert.ok(response);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Cache-Control'), 'private, max-age=60');
    const body = await response.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.checks));
  });

  it('GET /api/get-checker-configuration should attach private browser cache headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/get-checker-configuration?isActiveOnly=true');
    const response = await getCheckerConfigRoute(req);
    assert.ok(response);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Cache-Control'), 'private, max-age=60');
    const body = await response.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.configurations));
    assert.ok(body.configurations.length >= 1);
    // Unauthenticated callers must receive masked PII fields.
    assert.ok(body.configurations[0].mail_alert_address.includes('*'));
    assert.ok(body.configurations[0].mail_alert_contact.includes('*'));
  });

  it('GET /api/get-check-content should validate check_id query parameter', async () => {
    // Missing check_id
    const missingReq = new NextRequest('http://localhost:3000/api/get-check-content');
    const missingResponse = await getCheckContentRoute(missingReq);
    assert.strictEqual(missingResponse.status, 400);

    const body = await missingResponse.json();
    assert.strictEqual(body.error, 'Missing check_id parameter');

    // Valid check_id format but database disconnected / missing
    const validReq = new NextRequest('http://localhost:3000/api/get-check-content?check_id=999999');
    const response = await getCheckContentRoute(validReq);
    assert.ok([404, 500].includes(response.status));
  });

  it('POST /api/delete-check-content should validate request payload', async () => {
    const invalidReq = new NextRequest('http://localhost:3000/api/delete-check-content', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await deleteCheckContentRoute(invalidReq);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Missing check_id parameter');
  });

  it('POST /api/update-checker-configuration should validate configuration ID', async () => {
    const invalidReq = new NextRequest('http://localhost:3000/api/update-checker-configuration', {
      method: 'POST',
      body: JSON.stringify({ is_active: true }),
    });
    const res = await updateCheckerConfigRoute(invalidReq);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'Configuration ID is required');
  });

  it('POST /api/update-checker-configuration should reject invalid customer fields', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ id: 1, mail_alert_address: 'not-an-email' }, 'Invalid mail_alert_address: valid email address expected'],
      [{ id: 1, mail_alert_address: 'evil@example.com<script>' }, 'Invalid mail_alert_address: valid email address expected'],
      [{ id: 1, targetDate: '20/12/2026' }, 'Invalid targetDate: YYYY-MM-DD expected'],
      [{ id: 1, targetLabel: '' }, 'Invalid targetLabel: non-empty text of 100 characters max expected'],
      [{ id: 1, targetUrl: 'javascript:alert(1)' }, 'Invalid targetUrl: valid http or https URL expected'],
      [{ id: 1, mail_alert_contact: '<img src=x onerror=alert(1)>' }, 'Invalid mail_alert_contact: non-empty text of 100 characters max expected'],
      [{ id: 1, is_active: 'yes' }, 'Invalid is_active: boolean expected'],
    ];

    for (const [payload, expectedError] of cases) {
      const req = new NextRequest('http://localhost:3000/api/update-checker-configuration', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const res = await updateCheckerConfigRoute(req);
      assert.strictEqual(res.status, 400, `expected 400 for payload: ${JSON.stringify(payload)}`);
      const body = await res.json();
      assert.strictEqual(body.error, expectedError);
    }
  });

  it('POST /api/create-checker-configuration and /api/delete-checker-configuration should create, validate, and delete configs', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/create-checker-configuration', {
      method: 'POST',
      body: JSON.stringify({
        targetDate: '2026-12-20',
        targetLabel: 'New Resort',
        targetUrl: 'ftp://invalid-scheme.example.com',
      }),
    });
    const badRes = await createCheckerConfigRoute(badReq);
    assert.strictEqual(badRes.status, 400);

    const createReq = new NextRequest('http://localhost:3000/api/create-checker-configuration', {
      method: 'POST',
      body: JSON.stringify({
        is_active: true,
        targetDate: '2026-12-22',
        targetLabel: 'Chamonix EarlyBird',
        targetUrl: 'https://shop.chamonix.example.com/passes',
        is_mail_alert: false,
        mail_alert_address: '',
        mail_alert_contact: '',
      }),
    });
    const createRes = await createCheckerConfigRoute(createReq);
    assert.strictEqual(createRes.status, 201);
    const createdBody = await createRes.json();
    assert.strictEqual(createdBody.success, true);
    assert.strictEqual(createdBody.configuration.targetUrl, 'https://shop.chamonix.example.com/passes');

    const deleteReq = new NextRequest('http://localhost:3000/api/delete-checker-configuration', {
      method: 'POST',
      body: JSON.stringify({ id: createdBody.configuration.id }),
    });
    const deleteRes = await deleteCheckerConfigRoute(deleteReq);
    assert.strictEqual(deleteRes.status, 200);
    const deletedBody = await deleteRes.json();
    assert.strictEqual(deletedBody.success, true);
  });

  it('GET /api/get-db-usage should include private browser cache headers', async () => {
    const response = await getDbUsageRoute();
    assert.ok(response);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('Cache-Control'), 'private, max-age=300');
    const body = await response.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.dbUsage);
    assert.strictEqual(typeof body.dbUsage.size, 'string');
    assert.strictEqual(typeof body.dbUsage.collections, 'number');
  });

  it('POST /api/clear-cache should succeed and clear in-memory cache', async () => {
    const response = await clearCacheRoute();
    assert.strictEqual(response.status, 200);
    const body = await response.json();
    assert.deepStrictEqual(body, { success: true, message: 'Cache cleared' });
  });

  it('GET /api/scheduler should enforce CRON_SECRET authorization', async () => {
    const originalSecret = process.env.CRON_SECRET;
    try {
      // Fail closed: without a configured CRON_SECRET the scheduler must
      // refuse every request instead of auto-approving them.
      delete process.env.CRON_SECRET;
      const unsetReq = new NextRequest('http://localhost:3000/api/scheduler');
      const unsetRes = await schedulerRoute(unsetReq);
      assert.strictEqual(unsetRes.status, 401);

      process.env.CRON_SECRET = 'secret-test-token-123';

      // Unauthorized request (no token)
      const unauthorizedReq = new NextRequest('http://localhost:3000/api/scheduler');
      const unauthorizedRes = await schedulerRoute(unauthorizedReq);
      assert.strictEqual(unauthorizedRes.status, 401);
      const unauthorizedBody = await unauthorizedRes.json();
      assert.strictEqual(unauthorizedBody.error, 'Unauthorized');

      // Invalid token
      const invalidReq = new NextRequest('http://localhost:3000/api/scheduler', {
        headers: { Authorization: 'Bearer wrong-token' },
      });
      const invalidRes = await schedulerRoute(invalidReq);
      assert.strictEqual(invalidRes.status, 401);

      // Non-Bearer Authorization header must not be accepted
      const nonBearerReq = new NextRequest('http://localhost:3000/api/scheduler', {
        headers: { Authorization: 'secret-test-token-123' },
      });
      const nonBearerRes = await schedulerRoute(nonBearerReq);
      assert.strictEqual(nonBearerRes.status, 401);
    } finally {
      if (originalSecret !== undefined) {
        process.env.CRON_SECRET = originalSecret;
      } else {
        delete process.env.CRON_SECRET;
      }
    }
  });

  it('should immediately terminate and return 499 when client aborts request', async () => {
    const controller = new AbortController();
    controller.abort();

    // Test GET /api/get-checks with aborted signal
    const abortedChecksReq = new NextRequest('http://localhost:3000/api/get-checks', {
      signal: controller.signal,
    });
    const checksRes = await getChecksRoute(abortedChecksReq);
    assert.strictEqual(checksRes.status, 499);

    // Test GET /api/get-db-usage with aborted signal
    const abortedDbReq = new NextRequest('http://localhost:3000/api/get-db-usage', {
      signal: controller.signal,
    });
    const dbRes = await getDbUsageRoute(abortedDbReq);
    assert.strictEqual(dbRes.status, 499);

    // Test GET /api/get-checker-configuration with aborted signal
    const abortedConfigReq = new NextRequest('http://localhost:3000/api/get-checker-configuration', {
      signal: controller.signal,
    });
    const configRes = await getCheckerConfigRoute(abortedConfigReq);
    assert.strictEqual(configRes.status, 499);

    // Test POST /api/force-check with aborted signal
    const abortedForceReq = new NextRequest('http://localhost:3000/api/force-check', {
      method: 'POST',
      signal: controller.signal,
    });
    const forceRes = await forceCheckRoute(abortedForceReq);
    assert.strictEqual(forceRes.status, 499);
  });
});
