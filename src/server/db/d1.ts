// src/server/db/d1.ts
// Cloudflare D1 database client abstraction with in-memory test harness fallback.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1Response {
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Response>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

let inMemoryDb: D1Database | null = null;
let customMockDb: D1Database | null = null;

export function setMockD1Database(mock: D1Database | null): void {
  customMockDb = mock;
}

export function createInMemoryD1Database(): D1Database {
  const { DatabaseSync } = req('node:sqlite');
  const sqlite = new DatabaseSync(':memory:');

  // Load and apply initial migrations if available
  try {
    const schemaPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      sqlite.exec(fs.readFileSync(schemaPath, 'utf8'));
    }
    const seedPath = path.resolve(process.cwd(), 'migrations/0002_seed_configurations.sql');
    if (fs.existsSync(seedPath)) {
      sqlite.exec(fs.readFileSync(seedPath, 'utf8'));
    }
  } catch {
    // Ignore migration loading errors in non-filesystem environments
  }

  function wrapStatement(query: string, boundValues: unknown[] = []): D1PreparedStatement {
    return {
      bind(...values: unknown[]): D1PreparedStatement {
        return wrapStatement(query, values);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query);
        const row = stmt.get(...boundValues) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] as T) ?? null;
        return row as T;
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const rows = stmt.all(...boundValues) as T[];
        return {
          results: rows,
          success: true,
          meta: {},
        };
      },
      async run(): Promise<D1Response> {
        const stmt = sqlite.prepare(query);
        stmt.run(...boundValues);
        return {
          success: true,
          meta: {},
        };
      },
    };
  }

  return {
    prepare(query: string): D1PreparedStatement {
      return wrapStatement(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.all<T>());
      }
      return results;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
  };
}

export function resetInMemoryD1Database(): D1Database {
  inMemoryDb = createInMemoryD1Database();
  return inMemoryDb;
}

export function getDatabase(): D1Database {
  if (customMockDb) {
    return customMockDb;
  }

  // 1. Direct Cloudflare global context check
  const cfGlobal = (globalThis as Record<string | symbol, unknown>)[Symbol.for('__cloudflare-context__')] as
    | { env?: { DB?: D1Database } }
    | undefined;
  if (cfGlobal?.env?.DB) {
    return cfGlobal.env.DB;
  }

  // 2. Try to get Cloudflare context from OpenNext runtime
  try {
    const { getCloudflareContext } = req('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.DB) {
      return ctx.env.DB as D1Database;
    }
  } catch {
    // getCloudflareContext is not available outside request context (e.g. test runner)
  }

  // 3. Fallback to in-memory SQLite database for Node test runner / local environment
  if (!inMemoryDb) {
    inMemoryDb = createInMemoryD1Database();
  }
  return inMemoryDb;
}
