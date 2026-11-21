import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './worker-handler.ts';
import type { WorkerHandler } from './worker-handler.ts';

describe('Worker Handler Top-Level Error Boundary', () => {
  it('should forward normal valid requests to inner handler', async () => {
    const mockHandler: WorkerHandler = {
      fetch: async (req) => {
        return new Response(`OK: ${req.url}`, { status: 200 });
      },
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };
    const req = new Request('http://localhost:3000/');

    const res = await worker.fetch(req, {}, mockCtx);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.strictEqual(text, 'OK: http://localhost:3000/');
  });

  it('should allow public read-only GET API requests without a session', async () => {
    const mockHandler: WorkerHandler = {
      fetch: async (req) => new Response(`OK: ${new URL(req.url).pathname}`, { status: 200 }),
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };

    for (const pathname of [
      '/api/get-checks',
      '/api/get-check-content',
      '/api/get-checker-configuration',
      '/api/get-db-usage',
    ]) {
      const req = new Request(`http://localhost:3000${pathname}`, { method: 'GET' });
      const res = await worker.fetch(req, {}, mockCtx);
      assert.strictEqual(res.status, 200, `expected GET ${pathname} to be publicly accessible`);
    }
  });

  it('should return 401 for unauthenticated mutating or admin API requests (fail closed)', async () => {
    let handlerCalled = false;
    const mockHandler: WorkerHandler = {
      fetch: async () => {
        handlerCalled = true;
        return new Response('Should not be called', { status: 200 });
      },
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };

    for (const [method, pathname] of [
      ['POST', '/api/update-checker-configuration'],
      ['POST', '/api/create-checker-configuration'],
      ['POST', '/api/delete-checker-configuration'],
      ['POST', '/api/delete-check-content'],
      ['POST', '/api/force-check'],
      ['POST', '/api/clear-cache'],
      ['POST', '/api/get-checks'],
    ]) {
      const req = new Request(`http://localhost:3000${pathname}`, { method });
      const res = await worker.fetch(req, {}, mockCtx);
      assert.strictEqual(res.status, 401, `expected ${method} ${pathname} to fail closed with 401`);
      assert.strictEqual(res.headers.get('Cache-Control'), 'no-store');
      const body = await res.json();
      assert.strictEqual(body.error, 'Unauthorized');
    }
    assert.strictEqual(handlerCalled, false);
  });

  it('should forward mutating API requests carrying a valid admin session cookie', async () => {
    const { createSessionToken } = await import('./auth/admin-auth.ts');
    const env = { ADMIN_PASSWORD: 'admin-password-test' };
    const token = await createSessionToken(undefined, env);
    assert.ok(token);

    const mockHandler: WorkerHandler = {
      fetch: async () => new Response('OK', { status: 200 }),
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };
    const req = new Request('http://localhost:3000/api/update-checker-configuration', {
      method: 'POST',
      headers: { cookie: `admin_session=${token}` },
    });

    const res = await worker.fetch(req, env, mockCtx);
    assert.strictEqual(res.status, 200);
  });

  it('should forward exempt auth routes without a session', async () => {
    const mockHandler: WorkerHandler = {
      fetch: async (req) => new Response(`OK: ${new URL(req.url).pathname}`, { status: 200 }),
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };

    for (const pathname of ['/api/auth/login', '/api/auth/session', '/api/scheduler']) {
      const req = new Request(`http://localhost:3000${pathname}`);
      const res = await worker.fetch(req, {}, mockCtx);
      assert.strictEqual(res.status, 200, `expected ${pathname} to bypass the admin gate`);
    }
  });

  it('should intercept malformed URLs and return 400 without crashing', async () => {
    let handlerCalled = false;
    const mockHandler: WorkerHandler = {
      fetch: async () => {
        handlerCalled = true;
        return new Response('Should not be called', { status: 200 });
      },
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };

    // Pass an object with an invalid URL string that fails new URL(url)
    const malformedReq = {
      url: 'http://[invalid-ipv6-bracket',
    } as unknown as Request;

    const res = await worker.fetch(malformedReq, {}, mockCtx);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(handlerCalled, false);
    const text = await res.text();
    assert.strictEqual(text, 'Bad Request: Malformed URL');
  });

  it('should catch uncaught exceptions and return 500 JSON preventing Error 1101', async () => {
    const mockHandler: WorkerHandler = {
      fetch: async () => {
        throw new TypeError('Simulated unexpected crash in Next.js router');
      },
    };

    const worker = createWorker(mockHandler);
    const mockCtx = { waitUntil: () => {} };
    const req = new Request('http://localhost:3000/');

    const res = await worker.fetch(req, {}, mockCtx);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/json');

    const body = await res.json();
    assert.strictEqual(body.error, 'Internal Server Error');
    assert.strictEqual(body.message, 'Simulated unexpected crash in Next.js router');
  });

  it('should handle scheduled events and pass CRON_SECRET header', async () => {
    let capturedAuth: string | null = null;
    const mockHandler: WorkerHandler = {
      fetch: async (req) => {
        capturedAuth = req.headers.get('Authorization');
        return new Response('OK', { status: 200 });
      },
    };

    const worker = createWorker(mockHandler);
    let promiseResolved = false;
    const mockCtx = {
      waitUntil: (promise: Promise<unknown>) => {
        promise.then(() => {
          promiseResolved = true;
        });
      },
    };

    await worker.scheduled(
      { cron: '0 7 * * *', type: 'scheduled', scheduledTime: Date.now() },
      { CRON_SECRET: 'test-cron-secret-123' },
      mockCtx
    );

    // Wait a tick for waitUntil promise chain
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.strictEqual(capturedAuth, 'Bearer test-cron-secret-123');
    assert.strictEqual(promiseResolved, true);
  });
});
