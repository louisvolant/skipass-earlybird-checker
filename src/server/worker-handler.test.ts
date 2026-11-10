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
    const req = new Request('http://localhost:3000/api/get-checks');

    const res = await worker.fetch(req, {}, mockCtx);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.strictEqual(text, 'OK: http://localhost:3000/api/get-checks');
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
