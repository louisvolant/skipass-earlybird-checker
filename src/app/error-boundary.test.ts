import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Next.js App Router Error Boundaries', () => {
  it('should define root error.tsx client boundary', () => {
    const errorFilePath = path.join(process.cwd(), 'src/app/error.tsx');
    assert.ok(fs.existsSync(errorFilePath), 'src/app/error.tsx must exist');

    const content = fs.readFileSync(errorFilePath, 'utf-8');
    assert.ok(content.startsWith("'use client'"), 'error.tsx must be a client component');
    assert.ok(content.includes('export default function ErrorBoundary'), 'must export default ErrorBoundary');
    assert.ok(content.includes('error: Error'), 'must declare error prop');
    assert.ok(content.includes('reset: () => void'), 'must declare reset callback prop');
    assert.ok(content.includes('Try Again'), 'must render recovery action button');
  });

  it('should define global-error.tsx root layout fallback boundary', () => {
    const globalErrorFilePath = path.join(process.cwd(), 'src/app/global-error.tsx');
    assert.ok(fs.existsSync(globalErrorFilePath), 'src/app/global-error.tsx must exist');

    const content = fs.readFileSync(globalErrorFilePath, 'utf-8');
    assert.ok(content.startsWith("'use client'"), 'global-error.tsx must be a client component');
    assert.ok(content.includes('export default function GlobalError'), 'must export default GlobalError');
    assert.ok(content.includes('<html'), 'global-error.tsx must define <html> tag');
    assert.ok(content.includes('<body'), 'global-error.tsx must define <body> tag');
    assert.ok(content.includes('reset: () => void'), 'must accept reset function prop');
  });
});
