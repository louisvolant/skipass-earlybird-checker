# SkiPass EarlyBird Checker

A web application for monitoring ski resort websites and checking for early bird ski pass deals.

## Project Structure

```
├── src/app/      Next.js App Router pages and the API route handlers
├── src/server/   Server-only logic (MongoDB models, Mailjet, checker crawler)
├── public/       Static assets
└── README.md
```

The app is a single Next.js project. The checker logic, MongoDB persistence, Mailjet notifications, and the daily cron all run inside the same deployment — there is no separate backend server.

## Features

- Scheduled checks of ski resort websites
- Customizable search parameters (resort, date, search terms)
- Manual checks on demand
- Email alerts (Mailjet) when an early bird pass becomes available
- User-friendly web interface to view and manage checks
- Dark mode support
- Pagination and sorting of check results
- Filtering of check results by status (found/not found)
- Database usage display

## Requirements

- Node.js 20.9 or higher (Next.js 16 requirement; developed against Node 24 LTS)
- npm (comes with Node.js)

## Tech Stack

- **Next.js 16.3.1** (App Router)
- **React 19.2 / React DOM 19.2**
- **TypeScript 6.0.3** (pinned below 7.0 because `typescript-eslint` requires `<6.1.0`)
- **ESLint 9 + eslint-config-next 16.3.1**
- **Tailwind CSS 4 + daisyUI 5**
- **MongoDB (Mongoose 8)**, **Mailjet**, **recharts**

## Installation

```bash
npm install
```

Create a `.env.local` file with the environment variables used by the app (see Configuration below).

## Configuration

All configuration is done through environment variables. On Vercel, add these in **Project → Settings → Environment Variables**; for local development put them in `.env.local`:

- `MONGODB_ATLAS_USERNAME`, `MONGODB_ATLAS_PASSWORD`, `MONGODB_ATLAS_CLUSTER_URL`, `MONGODB_ATLAS_DB_NAME`, `MONGODB_ATLAS_APP_NAME` — MongoDB Atlas connection
- `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAIL_ORIGIN_ADDRESS` — email alerts
- `BASE_SKI_RESORT_URL`, `BASE_SKI_RESORT_URL_SHOP` — the ski resort site to scrape
- `CRON_SECRET` — optional bearer token protecting the `/api/scheduler` endpoint

## Usage / Development

```bash
npm run dev
```

The app (UI + API) will be available at `http://localhost:3000`.

## API endpoints

Served by the Next.js app at `/api/*`:

- `GET /api/get-checks` — list check history
- `GET /api/get-check-content?check_id=N` — detailed content of a check
- `POST /api/delete-check-content` — delete a check
- `POST /api/force-check` — run a check now
- `GET /api/get-checker-configuration?isActiveOnly=true` — checker settings
- `POST /api/update-checker-configuration` — update checker settings
- `POST /api/clear-cache` — invalidate cached results
- `GET /api/get-db-usage` — database size
- `GET /api/scheduler` — scheduled check (called by the cron, guarded by `CRON_SECRET`)

The daily cron (07:00 UTC) is defined in `vercel.json`.

## Deployment (Vercel)

1. Import the repository. The Next.js app is auto-detected at the repository root — no Root Directory override is needed. Framework Preset must be **Next.js** (enforced via `vercel.json` `"framework": "nextjs"`).
2. Add the env vars listed in Configuration.
3. Deploy. The crawler and all API routes deploy as serverless functions.

Before pushing changes, run:

```bash
npm run build
npm run lint
```

## License

[MIT License](https://opensource.org/licenses/MIT)
