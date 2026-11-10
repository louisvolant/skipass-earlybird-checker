// src/server/worker-handler.ts
// Factory for Cloudflare Worker entrypoint with top-level error boundaries and URL validation.

export interface WorkerEnv {
  CRON_SECRET?: string;
  [key: string]: unknown;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface WorkerHandler {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response>;
}

export function createWorker(handler: WorkerHandler) {
  return {
    async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
      try {
        // Validate URL early to catch malformed percent-encodings or probe URIs from automated bots
        try {
          new URL(request.url);
        } catch {
          return new Response('Bad Request: Malformed URL', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        return await handler.fetch(request, env, ctx);
      } catch (err: unknown) {
        console.error('[Worker Fatal Error] Unhandled exception in fetch handler:', err);
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'Unknown worker exception',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    },

    async scheduled(
      event: { cron: string; type: string; scheduledTime: number },
      env: WorkerEnv,
      ctx: ExecutionContext
    ) {
      console.log(`[Worker Cron] Triggered scheduled event for cron: ${event.cron}`);
      const url = new URL('/api/scheduler', 'http://localhost');
      const headers = new Headers();
      if (env.CRON_SECRET) {
        headers.set('Authorization', `Bearer ${env.CRON_SECRET}`);
      }
      const request = new Request(url.toString(), {
        method: 'GET',
        headers,
      });
      ctx.waitUntil(
        Promise.resolve(handler.fetch(request, env, ctx))
          .then((res: Response) => {
            console.log(`[Worker Cron] Scheduler responded with HTTP status: ${res.status}`);
          })
          .catch((err: unknown) => {
            console.error('[Worker Cron] Scheduled check failed:', err);
          })
      );
    },
  };
}
