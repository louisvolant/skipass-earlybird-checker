import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Public Dashboard and Protected Admin Route Structure', () => {
  it('should keep home page (/) public with read-only configuration and link to /admin', () => {
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/app/page.tsx'), 'utf-8');
    assert.ok(!homeSource.includes('AdminLogin'), 'public home page must not render AdminLogin gate');
    assert.ok(homeSource.includes('<CheckerConfiguration readOnly={true}'), 'home must render configuration in read-only mode');
    assert.ok(homeSource.includes('href="/admin"'), 'home must link to /admin');
  });

  it('should protect /admin configuration page with AdminLogin and enable editing', () => {
    const adminSource = fs.readFileSync(path.join(process.cwd(), 'src/app/admin/page.tsx'), 'utf-8');
    assert.ok(adminSource.includes('getSession()'), '/admin must probe admin session');
    assert.ok(adminSource.includes('<AdminLogin'), '/admin must render AdminLogin when signed out');
    assert.ok(adminSource.includes('<CheckerConfiguration readOnly={false}'), '/admin must render editable configuration');
    assert.ok(adminSource.includes('forceCheck()'), '/admin must expose protected Force Check action');
    assert.ok(adminSource.includes('logout()'), '/admin must expose Sign Out action');
  });
});
