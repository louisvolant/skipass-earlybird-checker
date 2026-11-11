# Cloudflare D1 Migration Plan: Migrating from MongoDB Atlas to Cloudflare D1

## 1. Executive Summary & Objectives

### Current State
`skipass-earlybird-checker` currently relies on a remote MongoDB Atlas database (`cluster0.flrom.mongodb.net`, database `SkipassEarlybirdCheckerDB`) via Mongoose 9. 

### Problems with Current Architecture
1. **Connection Timeouts & Latency Spikes**: Because Cloudflare Workers run in stateless, globally distributed V8 isolates, every cold start requires an external TCP/TLS socket handshake with SCRAM-SHA-256 authentication over the public internet to MongoDB Atlas. Under transient network slowdowns or firewall rejections, connection attempts hang until `serverSelectionTimeoutMS` (up to 30,000 ms), exhausting worker execution limits and triggering HTTP 500 errors and `Client Disconnected` events.
2. **IP Whitelisting Restrictions**: MongoDB Atlas requires `0.0.0.0/0` (Allow Access from Anywhere) because Cloudflare Workers have dynamic outbound IP addresses. If this rule expires or is restricted, all database operations fail immediately.
3. **M0 Free Tier Inactivity Pauses**: Free Atlas clusters automatically enter "Paused" state after periods of inactivity, taking the application offline until manually resumed.
4. **Bundle & Memory Overhead**: The Mongoose library and its transitive BSON serialization drivers add ~1.5 MB to the bundle and require substantial memory and CPU for document hydration.

### Target State
Migrate fully to **Cloudflare D1** (`skipass-earlybird-checker-d1`), Cloudflare's native serverless SQL database powered by SQLite.

### Key Benefits
- **Zero Connection Overhead**: D1 is colocated within Cloudflare's edge network. No TCP handshakes, no TLS negotiation, and no connection timeouts (typical query latency: 1–5 ms).
- **Zero Firewall / Whitelist Issues**: Internal Cloudflare binding (`env.DB`), completely immune to IP changes.
- **100% Availability**: No idle pauses, no cold start degradation.
- **Dramatically Reduced Worker CPU Time**: Replaces heavy BSON string parsing and Mongoose schema validation with native C++/V8 SQLite bindings.
- **Dependency Purge**: Complete removal of `mongoose` from `package.json`, reducing bundle size and attack surface.

---

## 2. Schema Design (SQLite / Cloudflare D1)

The application has only two models: checker configurations and check history. Both map directly into clean relational SQLite tables.

### Table 1: `checker_configurations`
Stores target ski dates, alert settings, and contact information.

```sql
CREATE TABLE IF NOT EXISTS checker_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_active INTEGER NOT NULL DEFAULT 1,          -- 1 = true, 0 = false
  target_date TEXT NOT NULL,                     -- e.g. '2026-12-20'
  target_label TEXT NOT NULL,                    -- e.g. 'Val Cenis Hauteluce'
  is_mail_alert INTEGER NOT NULL DEFAULT 0,      -- 1 = true, 0 = false
  mail_alert_address TEXT,                       -- recipient email
  mail_alert_contact TEXT,                       -- recipient name
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checker_config_active 
ON checker_configurations(is_active);
```

### Table 2: `checker_history`
Stores crawl execution results, prices, URLs, and truncated HTML responses.

```sql
CREATE TABLE IF NOT EXISTS checker_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  http_code TEXT,                                -- HTTP status code string (e.g. '200')
  full_url TEXT NOT NULL,                        -- crawled resort URL
  target_date TEXT,                              -- queried date
  target_label TEXT,                             -- resort name / pass type
  price REAL,                                    -- numeric price (e.g. 42.50 or NULL)
  response_text TEXT                             -- sanitized/truncated HTML snippet
);

CREATE INDEX IF NOT EXISTS idx_checker_history_created 
ON checker_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checker_history_target 
ON checker_history(target_date, target_label);
```

---

## 3. Data Migration & Seeding Strategy

### Step 3.1: Export Current MongoDB Data
Before switching off MongoDB Atlas, run a one-time export script to preserve existing configurations and recent history:
```bash
# Export existing configurations to JSON
mongoexport --uri="mongodb+srv://<USER>:<PASS>@cluster0.flrom.mongodb.net/SkipassEarlybirdCheckerDB" \
  --collection="checker_configuration" \
  --out="migrations/dump_checker_configuration.json"

# Export the latest 100 check records
mongoexport --uri="mongodb+srv://<USER>:<PASS>@cluster0.flrom.mongodb.net/SkipassEarlybirdCheckerDB" \
  --collection="checker_content" \
  --sort='{"created_at": -1}' \
  --limit=100 \
  --out="migrations/dump_checker_content.json"
```

### Step 3.2: SQL Migration Scripts
Create two migration files in `migrations/`:
1. `migrations/0001_initial_schema.sql`: Table creation and indexes.
2. `migrations/0002_seed_initial_configurations.sql`: Insert the baseline ski configurations so that the daily crawler can run immediately after deployment.

Example `migrations/0002_seed_initial_configurations.sql`:
```sql
INSERT INTO checker_configurations (id, is_active, target_date, target_label, is_mail_alert, mail_alert_address, mail_alert_contact)
VALUES 
  (1, 1, '2026-12-20', 'Val Cenis Journée', 1, 'alerts@example.com', 'Louis Volant'),
  (2, 1, '2027-01-15', 'Val Cenis 6 Jours', 1, 'alerts@example.com', 'Louis Volant')
ON CONFLICT(id) DO UPDATE SET 
  is_active = excluded.is_active,
  target_date = excluded.target_date,
  target_label = excluded.target_label;
```

---

## 4. Wrangler & OpenNext Configuration

### Step 4.1: Create D1 Database via Wrangler
```bash
npx wrangler d1 create skipass-earlybird-checker-d1
```
Output provides the unique `database_id` UUID:
```plain
✅ Successfully created DB 'skipass-earlybird-checker-d1'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 4.2: Update `wrangler.jsonc`
Add the `d1_databases` binding array:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "skipass-earlybird-checker",
  "main": "worker.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "skipass-earlybird-checker-d1",
      "database_id": "<database_id_uuid>"
    }
  ],
  "observability": {
    "logs": {
      "enabled": true,
      "invocation_logs": true
    }
  },
  "keep_vars": true,
  "triggers": {
    "crons": [
      "0 7 * * *"
    ]
  }
}
```

### Step 4.3: Execute Schema on Remote & Local D1
```bash
# Execute on remote Cloudflare D1
npx wrangler d1 execute skipass-earlybird-checker-d1 --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute skipass-earlybird-checker-d1 --remote --file=./migrations/0002_seed_initial_configurations.sql

# Execute on local D1 for preview & testing
npx wrangler d1 execute skipass-earlybird-checker-d1 --local --file=./migrations/0001_initial_schema.sql
```

---

## 5. Service Layer Refactoring

### Step 5.1: Create Centralized D1 Access Helper (`src/server/db/d1.ts`)
In Next.js with `@opennextjs/cloudflare`, the `env.DB` binding is accessed via `getCloudflareContext()`:

```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Response>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1Response {
  success: boolean;
  meta: Record<string, unknown>;
}

// In-memory mock instance for local Node test runner (npm test)
let mockDbInstance: D1Database | null = null;

export function setMockD1Database(db: D1Database | null) {
  mockDbInstance = db;
}

export function getDatabase(): D1Database {
  if (mockDbInstance) {
    return mockDbInstance;
  }

  try {
    const { env } = getCloudflareContext();
    if (env && (env as { DB?: D1Database }).DB) {
      return (env as { DB: D1Database }).DB;
    }
  } catch {
    // getCloudflareContext is not available outside request context (e.g. test runner)
  }

  throw new Error('Cloudflare D1 binding (DB) is unavailable in current execution context.');
}
```

### Step 5.2: Refactor `checker-configuration-service.ts`
Replace Mongoose schema and queries with direct, parameterized SQL statements:

```typescript
import { getDatabase } from '../db/d1.ts';

export interface ConfigurationRecord {
  id: number;
  is_active: number | boolean;
  target_date: string;
  target_label: string;
  is_mail_alert: number | boolean;
  mail_alert_address?: string;
  mail_alert_contact?: string;
}

export async function getConfigurations(isActiveOnly = true): Promise<ConfigurationRecord[]> {
  const db = getDatabase();
  const query = isActiveOnly
    ? 'SELECT * FROM checker_configurations WHERE is_active = 1 ORDER BY id ASC'
    : 'SELECT * FROM checker_configurations ORDER BY id ASC';

  const { results } = await db.prepare(query).all<ConfigurationRecord>();
  return results.map(row => ({
    ...row,
    is_active: Boolean(row.is_active),
    is_mail_alert: Boolean(row.is_mail_alert),
  }));
}

export async function updateConfiguration(
  id: number,
  updatedFields: Partial<ConfigurationRecord>
): Promise<ConfigurationRecord> {
  const db = getDatabase();
  const sets: string[] = [];
  const values: unknown[] = [];

  if ('is_active' in updatedFields) {
    sets.push('is_active = ?');
    values.push(updatedFields.is_active ? 1 : 0);
  }
  if ('target_date' in updatedFields) {
    sets.push('target_date = ?');
    values.push(updatedFields.target_date);
  }
  if ('target_label' in updatedFields) {
    sets.push('target_label = ?');
    values.push(updatedFields.target_label);
  }
  if ('is_mail_alert' in updatedFields) {
    sets.push('is_mail_alert = ?');
    values.push(updatedFields.is_mail_alert ? 1 : 0);
  }
  if ('mail_alert_address' in updatedFields) {
    sets.push('mail_alert_address = ?');
    values.push(updatedFields.mail_alert_address);
  }
  if ('mail_alert_contact' in updatedFields) {
    sets.push('mail_alert_contact = ?');
    values.push(updatedFields.mail_alert_contact);
  }

  sets.push("updated_at = datetime('now')");
  values.push(id);

  await db
    .prepare(`UPDATE checker_configurations SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM checker_configurations WHERE id = ?')
    .bind(id)
    .first<ConfigurationRecord>();

  if (!updated) {
    throw new Error(`Configuration not found for id: ${id}`);
  }

  return {
    ...updated,
    is_active: Boolean(updated.is_active),
    is_mail_alert: Boolean(updated.is_mail_alert),
  };
}
```

### Step 5.3: Refactor `checker-history-service.ts`
Replace Mongoose `CheckerContentModel` with parameterized SQL statements:

```typescript
import { getDatabase } from '../db/d1.ts';

export const MAX_RESPONSE_TEXT_LENGTH = 50_000;

export function sanitizeResponseText(text: string | null | undefined, maxLength = MAX_RESPONSE_TEXT_LENGTH): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n<!-- [Content truncated to ${maxLength} characters] -->`;
}

export async function getCheckList(): Promise<CheckListItem[]> {
  const db = getDatabase();
  const { results } = await db
    .prepare(`
      SELECT id, created_at, http_code, full_url, target_date, target_label, price
      FROM checker_history
      ORDER BY id DESC
      LIMIT 100
    `)
    .all<CheckListItem>();

  return results;
}

export async function getCheckContent(checkId: number): Promise<CheckDetailItem | null> {
  const db = getDatabase();
  return await db
    .prepare('SELECT * FROM checker_history WHERE id = ?')
    .bind(checkId)
    .first<CheckDetailItem>();
}

export async function saveCheckContent(
  httpCode: string,
  fullUrl: string,
  targetDate: string,
  targetLabel: string,
  price: number | string | null,
  responseText: string | null
): Promise<void> {
  const db = getDatabase();
  const sanitizedText = sanitizeResponseText(responseText);

  await db
    .prepare(`
      INSERT INTO checker_history (http_code, full_url, target_date, target_label, price, response_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    .bind(httpCode, fullUrl, targetDate, targetLabel, price ? Number(price) : null, sanitizedText)
    .run();
}

export async function deleteCheckContent(checkId: number): Promise<boolean> {
  const db = getDatabase();
  const res = await db.prepare('DELETE FROM checker_history WHERE id = ?').bind(checkId).run();
  return res.success;
}
```

### Step 5.4: Refactor `db-usage-service.ts`
Replace MongoDB `db.stats()` with D1 SQLite statistics:

```typescript
import { getDatabase } from '../db/d1.ts';

export interface DbUsageData {
  size: string;
  count: number;
}

let cachedUsage: { data: DbUsageData; timestamp: number } | null = null;
export const DB_USAGE_CACHE_TTL_MS = 300_000; // 5 minutes

export async function getDbUsage(): Promise<DbUsageData> {
  const now = Date.now();
  if (cachedUsage && now - cachedUsage.timestamp < DB_USAGE_CACHE_TTL_MS) {
    return cachedUsage.data;
  }

  try {
    const db = getDatabase();
    // Query row counts
    const historyCount = await db
      .prepare('SELECT count(*) as total FROM checker_history')
      .first<{ total: number }>();
    const configCount = await db
      .prepare('SELECT count(*) as total FROM checker_configurations')
      .first<{ total: number }>();

    const totalCount = (historyCount?.total || 0) + (configCount?.total || 0);

    // Approximate size in SQLite via page_count * page_size
    const pageCount = await db.prepare('PRAGMA page_count').first<{ page_count: number }>();
    const pageSize = await db.prepare('PRAGMA page_size').first<{ page_size: number }>();

    const bytes = (pageCount?.page_count || 0) * (pageSize?.page_size || 4096);
    const sizeInMb = (bytes / (1024 * 1024)).toFixed(2);

    const usage: DbUsageData = {
      size: `${sizeInMb} MB`,
      count: totalCount,
    };

    cachedUsage = { data: usage, timestamp: now };
    return usage;
  } catch (error) {
    if (cachedUsage) {
      console.warn('Falling back to stale DB usage cache on error');
      return cachedUsage.data;
    }
    throw error;
  }
}

export function clearDbUsageCache() {
  cachedUsage = null;
}
```

---

## 6. Dependency Purge & Clean Up

### Step 6.1: Uninstall MongoDB Dependencies
```bash
npm uninstall mongoose @types/mongoose
```

### Step 6.2: Delete Obsolete Mongoose Files
- Remove `src/server/config/mongoose.ts`
- Remove `src/server/config/mongoose.test.ts`

### Step 6.3: Purge Cloudflare Dashboard Secrets
Once deployed and verified on D1, delete obsolete secrets from Cloudflare:
```bash
npx wrangler secret delete MONGODB_ATLAS_PASSWORD
```
Remove unneeded variables from Cloudflare dashboard:
- `MONGODB_ATLAS_USERNAME`
- `MONGODB_ATLAS_CLUSTER_URL`
- `MONGODB_ATLAS_DB_NAME`
- `MONGODB_ATLAS_APP_NAME`
- `MONGODB_URI`

---

## 7. Testing Strategy

1. **Unit Testing without Network Dependencies**:
   - Create an in-memory SQLite mock (using `node:sqlite` built into Node 22+ or lightweight mocked D1 interface) in `src/server/db/d1-mock.ts`.
   - Update `checker-services.test.ts` and `db-usage-service.test.ts` to test all CRUD operations synchronously without any network calls.
2. **API Route Integration Tests**:
   - Run `src/app/api/routes.test.ts` against the in-memory D1 mock.
   - Verify that all endpoints (`/api/get-checks`, `/api/get-checker-configuration`, `/api/get-db-usage`) return 200 with expected JSON contracts and edge cache headers.
3. **Build & Bundle Verification**:
   - Run `npm test` (all tests passing under 500 ms).
   - Run `npm run lint`.
   - Run `npm run build` (`opennextjs-cloudflare build`) to ensure worker bundle compiles with D1 bindings.
   - Run `npx wrangler deploy --dry-run`.

---

## 8. Step-by-Step Implementation Checklist

| Phase | Task Description | Verification Gate | Status |
|---|---|---|---|
| **Phase 1: Setup & Migrations** | 1. Create `skipass-earlybird-checker-d1` via `wrangler d1 create`<br>2. Add binding to `wrangler.jsonc`<br>3. Write `migrations/0001_initial_schema.sql` and `migrations/0002_seed_configurations.sql`<br>4. Execute migrations locally & remotely | `wrangler d1 execute skipass-earlybird-checker-d1 --remote --command="SELECT count(*) FROM checker_configurations"` returns seeded rows. | ✅ **COMPLETED** (Database ID: `d980ce6d-f007-4ee2-aa4a-edf75e6017b1`, commit `0e8b9fa`) |
| **Phase 2: DB Layer & Mock** | 1. Create `src/server/db/d1.ts`<br>2. Create in-memory mock for Node test runner in `src/server/db/d1.test.ts` | `npm test` executes D1 abstraction tests with 100% pass rate. | ✅ **COMPLETED** (commit `4095912`) |
| **Phase 3: Service Refactoring** | 1. Rewrite `checker-configuration-service.ts`<br>2. Rewrite `checker-history-service.ts`<br>3. Rewrite `db-usage-service.ts`<br>4. Update tests in `checker-services.test.ts` & `db-usage-service.test.ts` | `npm test` validates all CRUD operations on SQLite. | ✅ **COMPLETED** (commit `346694e`) |
| **Phase 4: Purge Mongoose** | 1. Remove `mongoose` from `package.json`<br>2. Delete `src/server/config/mongoose.ts` & `mongoose.test.ts`<br>3. Run `npm install` | `npm run lint` and `npm test` pass with 0 references to Mongoose. | ✅ **COMPLETED** (commit `eed1c3f`) |
| **Phase 5: Verification & Build** | 1. Full OpenNext production build (`npm run build`)<br>2. Wrangler dry-run deployment | `.open-next/worker.js` generated; dry-run succeeds with `env.DB` binding visible. | ✅ **COMPLETED** (Startup time: 14 ms, 0 vulnerabilities) |
| **Phase 6: Deployment & Cleanup** | 1. Deploy to Cloudflare Workers (`npm run deploy`)<br>2. Verify live dashboard at `https://skipass-earlybird-checker.louisvolant.com`<br>3. Audit execution and response codes | Live HTTP 200 on `/api/get-checker-configuration` in < 50 ms with 0 ms connection overhead. | ✅ **COMPLETED** (Deployed version: `b3e26629-2354-4386-a942-eb43fe75a96d`, audited with HTTP 200 on all endpoints) |

---

## 9. Rollback Strategy
If any unforeseen issue occurs during rollout:
1. `wrangler.jsonc` can immediately rebind MongoDB environment variables using `npx wrangler rollback`.
2. Git branch can be reverted to commit `d498d33` which maintains the existing Mongoose 9 codebase.
3. No data loss risk: MongoDB Atlas database remains untouched and intact during the entire D1 rollout.
