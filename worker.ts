// worker.ts
// Entrypoint for Cloudflare Workers combining OpenNext Next.js handler with cron trigger support.
// Encapsulated with a top-level error boundary to prevent uncaught exceptions (Error 1101).

// @ts-ignore .open-next/worker.js is generated at build time by @opennextjs/cloudflare
import { default as handler } from './.open-next/worker.js';
import { createWorker } from './src/server/worker-handler.ts';

const worker = createWorker(handler);

export default worker;
