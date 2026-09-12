// worker.ts
// Entrypoint for Cloudflare Workers combining OpenNext Next.js handler with cron trigger support.

// @ts-ignore .open-next/worker.js is generated at build time by @opennextjs/cloudflare
import { default as handler } from './.open-next/worker.js';

interface WorkerEnv {
  CRON_SECRET?: string;
  [key: string]: unknown;
}

const worker = {
  fetch: handler.fetch,

  async scheduled(
    event: { cron: string; type: string; scheduledTime: number },
    env: WorkerEnv,
    ctx: { waitUntil: (promise: Promise<unknown>) => void }
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

export default worker;
