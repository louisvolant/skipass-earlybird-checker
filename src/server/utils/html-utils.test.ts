import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './html-utils.ts';

describe('HTML Escaping for Email Bodies', () => {
  it('should escape all HTML-significant characters', () => {
    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml("it's & more"), 'it&#39;s &amp; more');
  });

  it('should return safe values for numbers', () => {
    assert.strictEqual(escapeHtml(399), '399');
    assert.strictEqual(escapeHtml(0), '0');
  });

  it('should return an empty string for nullish values', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
    assert.strictEqual(escapeHtml(''), '');
  });
});
