# SkiPass EarlyBird Checker

A web application for monitoring ski resort websites and checking for early bird ski pass deals.

Built with **Next.js 16 (App Router)** and ready to deploy on **Cloudflare Workers** using [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## Project Structure

```
├── src/app/          Next.js App Router pages and API route handlers (/api/*)
├── src/server/       Server-only logic (Mongoose models, Mailjet, crawler service)
├── src/lib/          Client API client and TypeScript interfaces
├── public/           Static assets and Cloudflare cache headers (_headers)
├── open-next.config.ts OpenNext Cloudflare adapter configuration
├── wrangler.jsonc    Cloudflare Workers configuration (crons, assets, keep_vars)
├── worker.ts         Cloudflare Worker entrypoint with OpenNext handler & cron support
└── README.md
```

The app is a single Next.js project. The checker crawler logic, MongoDB persistence, Mailjet notifications, web dashboard, and the daily scheduled cron all run inside the same deployment — there is no separate backend server required.

## Features

- **Scheduled Checks**: Automated ski resort queries running daily at 07:00 UTC (via Cloudflare Workers Cron Triggers or Vercel Crons)
- **Customizable Search Parameters**: Configurable resort, target dates, and search terms stored in MongoDB
- **Manual Checks on Demand**: Trigger crawler runs directly from the web interface
- **Email Alerts**: Mailjet notifications when an early bird pass becomes available
- **Web Dashboard**: Responsive user interface to view, sort, filter, and inspect check history
- **Dark Mode Support**: DaisyUI theme switching
- **Database Usage Display**: Real-time MongoDB collection size and object count monitoring
- **Footer Navigation & Portfolio Links**: Quick navigation links to ecosystem web apps and tools (such as Whois at `whois.louisvolant.com`, OpenSkipass, etc.)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Deployment Platform**: Cloudflare Workers (via `@opennextjs/cloudflare` + `wrangler`)
- **Frontend**: React 19, Tailwind CSS 4, daisyUI 5, recharts
- **Backend / Services**:
  - Next.js Route Handlers (`/app/api/.../route.ts`)
  - MongoDB via Mongoose 8 (lazy connection with singleton caching)
  - Mailjet Email API (`node-mailjet`)
  - HTML parsing via `htmlparser2`
- **TypeScript**: TypeScript 6.0+

---

## Requirements

- **Node.js**: 20.9 or higher (developed and tested with Node 24 LTS)
- **npm**: 10+ (bundled with Node.js)
- **Cloudflare Account**: For deploying to Cloudflare Workers (free or paid plan)
- **MongoDB Atlas Database**: Free M0 tier or dedicated cluster
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
| `MONGODB_URI` | *(Optional)* Full MongoDB connection string. If provided, overrides individual Atlas vars. | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `MONGODB_ATLAS_USERNAME` | MongoDB Atlas username | `myuser` |
| `MONGODB_ATLAS_PASSWORD` | MongoDB Atlas password | `mypassword` |
| `MONGODB_ATLAS_CLUSTER_URL`| MongoDB Atlas cluster host | `cluster0.abcde.mongodb.net` |
| `MONGODB_ATLAS_DB_NAME` | Target MongoDB database name | `skipass_checker` |
| `MONGODB_ATLAS_APP_NAME` | Atlas application identifier | `Cluster0` |
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

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/get-checks` | Fetch recent check history |
| `GET` | `/api/get-check-content?check_id=<id>` | Retrieve full HTML / parsed details for a specific check |
| `POST`| `/api/delete-check-content` | Delete a check entry by ID (`{ "check_id": <id> }`) |
| `POST`| `/api/force-check` | Manually run crawler checks across active configurations |
| `GET` | `/api/get-checker-configuration?isActiveOnly=true` | List active or all checker configurations |
| `POST`| `/api/update-checker-configuration` | Update an existing checker configuration |
| `POST`| `/api/clear-cache` | Invalidate cached results |
| `GET` | `/api/get-db-usage` | Fetch MongoDB database size and stats |
| `GET` | `/api/scheduler` | Scheduled check endpoint (invoked by cron triggers, guarded by `CRON_SECRET`) |

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
3. The crawler queries resort availability, updates MongoDB, and sends Mailjet alerts if passes are found.

---

## Verification & Code Quality

Before committing or deploying, run the verification scripts:

```bash
# Code linting (ESLint 9)
npm run lint

# Unit tests
npm test

# Production build for Cloudflare Workers (runs Next.js + OpenNext adapter)
npm run build

# Next.js-only standalone build
npm run build:next

# Dry run deployment verification
npx wrangler deploy --dry-run
```

---

## License

[MIT License](https://opensource.org/licenses/MIT)
