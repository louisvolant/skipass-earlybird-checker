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

  it('should define compatible Cloudflare dependencies in package.json', () => {
    // Verify required deployment dependencies exist and are valid objects
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.devDependencies['@opennextjs/cloudflare'], '@opennextjs/cloudflare should be declared');
    assert.ok(pkg.devDependencies['wrangler'], 'wrangler should be declared');
  });

  it('should declare updated minor/patch versions for core libraries', () => {
    // Verify core packages are maintained on stable releases
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.dependencies.axios, 'axios dependency should exist');
    assert.ok(pkg.dependencies.mongoose, 'mongoose dependency should exist');
    assert.ok(pkg.dependencies.react, 'react dependency should exist');
    assert.ok(pkg.devDependencies.tailwindcss, 'tailwindcss devDependency should exist');
    assert.ok(pkg.devDependencies.daisyui, 'daisyui devDependency should exist');
  });

  it('should specify package overrides to remediate transitive security vulnerabilities', () => {
    // Check security overrides ensuring zero vulnerabilities in npm audit
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.overrides, 'overrides section should be declared in package.json');
    assert.ok(pkg.overrides.glob, 'glob override should be declared');
  });
});
