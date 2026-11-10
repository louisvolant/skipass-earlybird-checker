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
import { POST as forceCheckRoute } from './force-check/route.ts';

describe('API Route Handlers and Edge Caching', () => {
  it('GET /api/get-checks should attach Cloudflare edge cache headers', async () => {
    const response = await getChecksRoute();
    assert.ok(response);
    if (response.status === 200) {
      assert.strictEqual(
        response.headers.get('Cache-Control'),
        'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
      );
    } else {
      assert.strictEqual(response.status, 500);
    }
  });

  it('GET /api/get-checker-configuration should attach Cloudflare edge cache headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/get-checker-configuration?isActiveOnly=true');
    const response = await getCheckerConfigRoute(req);
    assert.ok(response);
    if (response.status === 200) {
      assert.strictEqual(
        response.headers.get('Cache-Control'),
        'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
      );
    } else {
      assert.strictEqual(response.status, 500);
    }
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

  it('GET /api/get-db-usage should include 5-minute edge cache headers', async () => {
    const response = await getDbUsageRoute();
    assert.ok(response);
    if (response.status === 200) {
      assert.strictEqual(
        response.headers.get('Cache-Control'),
        'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
      );
    } else {
      assert.strictEqual(response.status, 500);
    }
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
