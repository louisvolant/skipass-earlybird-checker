import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Cloudflare D1 Configuration and Schema Migrations', () => {
  const wranglerConfigPath = path.resolve(process.cwd(), 'wrangler.jsonc');
  const schemaMigrationPath = path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql');
  const seedMigrationPath = path.resolve(process.cwd(), 'migrations/0002_seed_configurations.sql');

  function parseJsonc(content: string) {
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    return JSON.parse(stripped);
  }

  it('wrangler.jsonc should declare D1 database binding named DB', () => {
    assert.ok(fs.existsSync(wranglerConfigPath), 'wrangler.jsonc must exist');
    const content = fs.readFileSync(wranglerConfigPath, 'utf8');
    const config = parseJsonc(content);

    assert.ok(Array.isArray(config.d1_databases), 'd1_databases must be configured as an array');
    const dbBinding = config.d1_databases.find(
      (b: { binding: string; database_name: string }) => b.binding === 'DB'
    );
    assert.ok(dbBinding, 'D1 binding named DB must be defined');
    assert.strictEqual(dbBinding.database_name, 'skipass-earlybird-checker-d1');
    assert.ok(dbBinding.database_id, 'database_id UUID must be present');
  });

  it('schema migration files should exist and declare required tables', () => {
    assert.ok(fs.existsSync(schemaMigrationPath), '0001_initial_schema.sql must exist');
    const schemaSql = fs.readFileSync(schemaMigrationPath, 'utf8');
    assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS checker_configurations'));
    assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS checker_history'));
    assert.ok(schemaSql.includes('idx_checker_config_active'));
    assert.ok(schemaSql.includes('idx_checker_history_created'));

    assert.ok(fs.existsSync(seedMigrationPath), '0002_seed_configurations.sql must exist');
    const seedSql = fs.readFileSync(seedMigrationPath, 'utf8');
    assert.ok(seedSql.includes('INSERT INTO checker_configurations'));
  });
});
