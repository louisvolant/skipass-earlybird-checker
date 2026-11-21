import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { externalLinks, internalLinks } from './links.ts';

describe('links configuration', () => {
  it('should export valid internal links including Home and Admin', () => {
    assert.ok(internalLinks.length >= 2);
    for (const link of internalLinks) {
      assert.ok(link.label);
      assert.ok(link.href.startsWith('/'));
    }
    assert.ok(internalLinks.some((link) => link.href === '/'));
    assert.ok(internalLinks.some((link) => link.href === '/admin'));
  });

  it('should export Personal Page and Portfolio external links', () => {
    assert.strictEqual(externalLinks.length, 2);
    assert.deepStrictEqual(externalLinks[0], {
      label: 'Personal Page',
      href: 'https://www.louisvolant.com',
    });
    assert.deepStrictEqual(externalLinks[1], {
      label: 'Portfolio',
      href: 'https://www.louisvolant.com/portfolio',
    });
  });
});
