# SkiPass EarlyBird Checker

A web application for monitoring ski resort websites and checking for early bird ski pass deals.

Built with **Next.js 16 (App Router)** and ready to deploy on **Cloudflare Workers** using [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## Project Structure

```
├── src/app/          Next.js App Router pages and API route handlers (/api/*)
├── src/server/       Server-only logic (D1 database client, Mailjet, crawler service)
├── src/lib/          Client API client and TypeScript interfaces
├── public/           Static assets and Cloudflare cache headers (_headers)
├── open-next.config.ts OpenNext Cloudflare adapter configuration
├── wrangler.jsonc    Cloudflare Workers configuration (crons, assets, keep_vars, observability)
├── worker.ts         Cloudflare Worker entrypoint with OpenNext handler & cron support
└── README.md
```

The app is a single Next.js project. The checker crawler logic, Cloudflare D1 persistence, Mailjet notifications, web dashboard, and the daily scheduled cron all run inside the same deployment — there is no separate backend server required.

## Features

- **Scheduled Checks**: Automated ski resort queries running daily at 07:00 UTC (via Cloudflare Workers Cron Triggers or Vercel Crons)
- **Customizable Search Parameters**: Configurable resort, target dates, and search terms stored in Cloudflare D1
- **Manual Checks on Demand**: Trigger crawler runs directly from the web interface
- **Email Alerts**: Mailjet notifications when an early bird pass becomes available
- **Web Dashboard**: Responsive user interface to view, sort, filter, and inspect check history
- **Dark Mode Support**: DaisyUI theme switching
- **Cloudflare D1 Database & SQLite Migrations**: Serverless SQLite persistence running natively on Cloudflare edge via D1 (`skipass-earlybird-checker-d1`) with automated schema migrations
- **Database Usage Display & Edge Caching**: Real-time database size and object count monitoring with in-memory TTL caching and Cloudflare Edge Cache-Control headers
- **Cloudflare Observability**: Built-in Workers observability with invocation logs tracking execution status and durations
- **Resilient Worker Entrypoint & Crash Prevention**: Top-level error boundary and early URL validation in the Cloudflare Worker entrypoint preventing uncaught exceptions (Error 1101) from scanner probes or runtime crashes
- **Next.js App Router Error Boundaries**: Custom `error.tsx` and `global-error.tsx` fallback boundaries providing graceful error recovery UI and preventing rendering exceptions from bubbling to the server runtime
- **Client Disconnect & Abort Signal Handling**: Early termination and cancellation via `request.signal` (returning HTTP 499) across API routes and resort crawler requests to abort redundant worker CPU processing when clients close connections
- **Optimized Edge Performance & HTTP Caching**: Native Cloudflare D1 SQL queries, bounded limits, and sanitized HTML payload capping combined with Cloudflare Edge `Cache-Control` response headers across API routes to minimize V8 isolate cold starts, CPU compute time, and serialization overhead
- **Footer Navigation & Portfolio Links**: Quick navigation links to ecosystem web apps and tools (such as Whois at `whois.louisvolant.com`, Currency Converter at `currency-converter.louisvolant.com`, OpenSkipass, etc.)

## Tech Stack

- **Tech Stack**: Next.js 16 (App Router, Turbopack)
- **Deployment Platform**: Cloudflare Workers (via `@opennextjs/cloudflare` 1.20+ + `wrangler` 4.156+)
- **Frontend**: React 19.3, Tailwind CSS 4.3, daisyUI 5.7
- **Backend / Services**:
  - Next.js Route Handlers (`/app/api/.../route.ts`)
  - Cloudflare D1 (native edge SQLite with zero connection overhead and in-memory test runner harness)
  - HTTP requests via Axios 1.21
  - Mailjet Email API (`node-mailjet`)
  - HTML parsing via `htmlparser2` 12
  - Analytics via `@vercel/speed-insights` 2
- **TypeScript**: TypeScript 6.0+

---

## Requirements

- **Node.js**: 20.9 or higher (developed and tested with Node 24 LTS)
- **npm**: 10+ (bundled with Node.js)
- **Cloudflare Account**: For deploying to Cloudflare Workers with D1 (free or paid plan)
- **Mailjet Account**: API credentials for sending email notifications

---

## Installation

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

---

## Configuration & Environment Variables

All configuration is managed via environment variables.

| Variable | Description | Example |
|---|---|---|
| `MAILJET_API_KEY` | Mailjet public API key | `...` |
| `MAILJET_SECRET_KEY` | Mailjet secret API key | `...` |
| `MAIL_ORIGIN_ADDRESS` | Sender email address registered in Mailjet | `alerts@example.com` |
| `BASE_SKI_RESORT_URL` | Base resort website URL | `https://www.resort.com` |
| `BASE_SKI_RESORT_URL_SHOP`| Resort shopping/booking search URL | `https://shop.resort.com/fr/pass` |
| `CRON_SECRET` | *(Optional)* Bearer token protecting `/api/scheduler` | `my-secure-token` |

### Environment Variables on Cloudflare Workers

When deploying to Cloudflare Workers:
1. Set secrets and environment variables in the **Cloudflare Dashboard** under **Workers & Pages → Your Worker → Settings → Variables and Secrets** (or using `npx wrangler secret put <KEY>`).
2. Our configuration explicitly enables `keep_vars = true` in `wrangler.jsonc` (and `--keep-vars` in deployment scripts). This ensures that environment variables and secrets configured in the Cloudflare Dashboard are **never overwritten or deleted** during automated CLI or CI/CD deployments.
3. For local development with Wrangler (`npm run preview`), create `.dev.vars` (see `.dev.vars.example`):
   ```plain
   NEXTJS_ENV=development
   ```

---

## Local Development

### 1. Standard Next.js Development Server

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard. Backend API route handlers in `src/app/api/*` are active and reload automatically.

### 2. Local Cloudflare Workers Preview

To test the application in the exact Cloudflare `workerd` runtime locally before deploying:

```bash
npm run preview
```

This compiles the Next.js app with OpenNext and launches the local Wrangler development server.

---

## API Endpoints

All backend routes follow Next.js App Router conventions in `src/app/api/.../route.ts`:

| Method | Endpoint | Description | Cache-Control |
|---|---|---|---|
| `GET` | `/api/get-checks` | Fetch recent check history | Edge cache (60s, stale-while-revalidate 120s) |
| `GET` | `/api/get-check-content?check_id=<id>` | Retrieve full HTML / parsed details for a specific check | Edge cache (24h immutable history) |
| `POST`| `/api/delete-check-content` | Delete a check entry by ID (`{ "check_id": <id> }`) | Dynamic |
| `POST`| `/api/force-check` | Manually run crawler checks across active configurations | Dynamic |
| `GET` | `/api/get-checker-configuration?isActiveOnly=true` | List active or all checker configurations | Edge cache (60s, stale-while-revalidate 300s) |
| `POST`| `/api/update-checker-configuration` | Update an existing checker configuration | Dynamic |
| `POST`| `/api/clear-cache` | Invalidate cached results | Dynamic |
| `GET` | `/api/get-db-usage` | Fetch Cloudflare D1 database size and stats | Edge cache (300s, stale-while-revalidate 600s) |
| `GET` | `/api/scheduler` | Scheduled check endpoint (invoked by cron triggers, guarded by `CRON_SECRET`) | Dynamic (guarded) |

---

## Cloudflare Workers Deployment

### Automated Deployment with OpenNext & Wrangler

1. Authenticate with Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Add your environment variables and secrets in the Cloudflare Dashboard:
   - Navigate to **Workers & Pages → skipass-earlybird-checker → Settings → Variables and Secrets**.
   - Add all variables listed in the [Configuration](#configuration--environment-variables) section.

3. Deploy the application:

   ```bash
   npm run deploy
   ```

   This executes:
   - `next build` (Next.js production build)
   - `opennextjs-cloudflare build` (transforms build output into `.open-next/worker.js` and assets)
   - `opennextjs-cloudflare deploy --keep-vars` (deploys to Cloudflare Workers while preserving Dashboard variables)

### Scheduled Cron Triggers

The daily schedule is configured in `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 7 * * *"]
}
```

When the cron fires at 07:00 UTC daily:
1. Cloudflare Workers calls the `scheduled()` event handler in `worker.ts`.
2. The handler forwards the request to `/api/scheduler` with the authorization header (`Bearer $CRON_SECRET`).
3. The crawler queries resort availability, updates Cloudflare D1, and sends Mailjet alerts if passes are found.

### Observability & Logging

Cloudflare Workers Observability is configured in `wrangler.jsonc`:

```jsonc
"observability": {
  "logs": {
    "enabled": true,
    "invocation_logs": true
  }
}
```

- `logs.enabled`: Set to `true` to enable persistent log storage in Cloudflare Workers Logs, retaining console logs and runtime stack traces for error diagnostics and debugging.
- `logs.invocation_logs`: Set to `true` to capture invocation traces (HTTP status code, execution duration, and timestamp) in Cloudflare's dashboard for both fetch requests and scheduled cron executions.

---

## Verification & Code Quality

Before committing or deploying, run the verification scripts:

```bash
# Code linting (ESLint 9)
npm run lint

# Unit tests
npm test

# Security vulnerability audit
npm audit

# Production build for Cloudflare Workers (runs Next.js + OpenNext adapter)
npm run build

# Next.js-only standalone build
npm run build:next

# Dry run deployment verification
npx wrangler deploy --dry-run
```

### Cloudflare D1 Database Client & In-Memory Test Harness

The application provides a unified D1 database interface at `src/server/db/d1.ts`:
- In Cloudflare Workers runtime (or preview), it resolves the native D1 binding (`env.DB`) from OpenNext or worker context.
- In Node.js testing environments (`npm test`), it seamlessly initializes an in-memory SQLite database via Node's native `node:sqlite` (`DatabaseSync(':memory:')`), applying all SQL migrations automatically without external dependencies.
- Custom database mocks can be registered with `setMockD1Database()` for isolated unit testing.

### Cloudflare D1 Database Migrations

Apply and verify database schema migrations on Cloudflare D1:

```bash
# Execute schema migration on remote D1 database
npx wrangler d1 execute skipass-earlybird-checker-d1 --remote --file=./migrations/0001_initial_schema.sql --yes

# Execute baseline configurations seed on remote D1
npx wrangler d1 execute skipass-earlybird-checker-d1 --remote --file=./migrations/0002_seed_configurations.sql --yes

# Query remote D1 tables
npx wrangler d1 execute skipass-earlybird-checker-d1 --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --yes
```

### Import Data from MongoDB Atlas to Cloudflare D1

To migrate historical data and configurations directly from MongoDB Atlas into Cloudflare D1:

```bash
MONGODB_URI="mongodb+srv://<USER>:<PASSWORD>@cluster0.flrom.mongodb.net/SkipassEarlybirdCheckerDB?retryWrites=true&w=majority" npm run migrate:mongo-to-d1
```

The script extracts all documents, generates optimized SQLite inserts, executes them on the remote `skipass-earlybird-checker-d1` database, and audits the total row counts. Add `--local` to target the local development D1 database.

### Security & Dependency Overrides

The repository uses npm package `overrides` in `package.json` to secure transitive dependencies (such as `glob` and `minimatch`) without breaking Cloudflare OpenNext adapter compatibility, achieving 0 vulnerabilities in `npm audit`.

---

## License

[MIT License](https://opensource.org/licenses/MIT)
