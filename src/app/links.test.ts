import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { externalLinks, internalLinks } from './links.ts';

describe('links configuration', () => {
  it('should export valid internal links', () => {
    assert.ok(internalLinks.length > 0);
    for (const link of internalLinks) {
      assert.ok(link.label);
      assert.ok(link.href.startsWith('/'));
    }
  });

  it('should export valid external links', () => {
    assert.ok(externalLinks.length > 0);
    for (const link of externalLinks) {
      assert.ok(link.label);
      assert.ok(link.href.startsWith('http'));
    }
  });

  it('should point Whois to whois.louisvolant.com', () => {
    const whoisLink = externalLinks.find((link) => link.label === 'Whois');
    assert.ok(whoisLink);
    assert.strictEqual(whoisLink.href, 'https://whois.louisvolant.com');
  });

  it('should point Currency Converter to currency-converter.louisvolant.com', () => {
    const currencyLink = externalLinks.find((link) => link.label === 'Currency Converter');
    assert.ok(currencyLink);
    assert.strictEqual(currencyLink.href, 'https://currency-converter.louisvolant.com');
  });
});
