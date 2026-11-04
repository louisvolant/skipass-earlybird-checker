import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Cloudflare Observability and Wrangler configuration', () => {
  const wranglerConfigPath = path.resolve(process.cwd(), 'wrangler.jsonc');

  // Strip single-line (//) and multi-line (/* */) comments to safely parse JSONC
  function parseJsonc(content: string) {
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    return JSON.parse(stripped);
  }

  it('wrangler.jsonc file should exist and be valid JSONC', () => {
    assert.ok(fs.existsSync(wranglerConfigPath), 'wrangler.jsonc should exist at project root');
    const content = fs.readFileSync(wranglerConfigPath, 'utf8');
    const config = parseJsonc(content);
    assert.ok(typeof config === 'object' && config !== null);
  });

  it('should have Cloudflare observability configured with invocation logs enabled and logs disabled', () => {
    const content = fs.readFileSync(wranglerConfigPath, 'utf8');
    const config = parseJsonc(content);

    assert.ok(config.observability, 'config should define observability');
    assert.ok(config.observability.logs, 'config.observability should define logs');
    assert.strictEqual(
      config.observability.logs.enabled,
      false,
      'observability.logs.enabled should be false'
    );
    assert.strictEqual(
      config.observability.logs.invocation_logs,
      true,
      'observability.logs.invocation_logs should be true'
    );
  });

  it('should maintain required Cloudflare Worker settings', () => {
    const content = fs.readFileSync(wranglerConfigPath, 'utf8');
    const config = parseJsonc(content);

    assert.strictEqual(config.name, 'skipass-earlybird-checker');
    assert.strictEqual(config.main, 'worker.ts');
    assert.strictEqual(config.keep_vars, true);
    assert.ok(Array.isArray(config.compatibility_flags));
    assert.ok(config.compatibility_flags.includes('nodejs_compat'));
  });
});
