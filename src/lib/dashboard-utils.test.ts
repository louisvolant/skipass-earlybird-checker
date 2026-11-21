import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfigUpdatePayload,
  filterChecks,
  formatCompactTimestamp,
  sortChecks,
} from './dashboard-utils.ts';
import type { Check, CheckerConfiguration } from './types.ts';

describe('Dashboard Utility Helpers', () => {
  const sampleChecks: Check[] = [
    {
      id: 1,
      timestamp: '2026-11-20T07:00:00Z',
      httpCode: '200',
      url: 'https://shop.resort-a.com/pass',
      targetDate: '2026-12-20',
      targetLabel: 'Val Cenis',
      price: null,
      hasContent: false,
    },
    {
      id: 2,
      timestamp: '2026-11-21T07:00:00Z',
      httpCode: '200',
      url: 'https://shop.resort-b.com/pass',
      targetDate: '2026-12-22',
      targetLabel: 'Tignes',
      price: 399,
      hasContent: true,
    },
  ];

  it('should filter checks by availability status', () => {
    assert.strictEqual(filterChecks(sampleChecks, 'all').length, 2);
    assert.strictEqual(filterChecks(sampleChecks, 'found').length, 1);
    assert.strictEqual(filterChecks(sampleChecks, 'found')[0].id, 2);
    assert.strictEqual(filterChecks(sampleChecks, 'notfound').length, 1);
    assert.strictEqual(filterChecks(sampleChecks, 'notfound')[0].id, 1);
  });

  it('should sort checks cleanly with null values placed last', () => {
    const ascByPrice = sortChecks(sampleChecks, { key: 'price', direction: 'asc' });
    assert.strictEqual(ascByPrice[0].id, 2);
    assert.strictEqual(ascByPrice[1].id, 1);

    const descByLabel = sortChecks(sampleChecks, { key: 'targetLabel', direction: 'desc' });
    assert.strictEqual(descByLabel[0].targetLabel, 'Val Cenis');
    assert.strictEqual(descByLabel[1].targetLabel, 'Tignes');
  });

  it('should build minimal update payload containing only changed fields', () => {
    const original: CheckerConfiguration = {
      id: 1,
      is_active: true,
      targetDate: '2026-12-20',
      targetLabel: 'Val Cenis',
      targetUrl: 'https://shop.resort.com/pass',
      is_mail_alert: true,
      mail_alert_address: 'alerts@example.com',
      mail_alert_contact: 'Admin',
    };

    const unchanged = buildConfigUpdatePayload(original, { ...original });
    assert.deepStrictEqual(unchanged, {});

    const updated = buildConfigUpdatePayload(original, {
      ...original,
      targetUrl: 'https://shop.new-resort.com/pass',
      targetLabel: 'Les Arcs',
    });
    assert.deepStrictEqual(updated, {
      targetLabel: 'Les Arcs',
      targetUrl: 'https://shop.new-resort.com/pass',
    });
  });

  it('should format valid timestamps compactly and fall back gracefully on invalid ones', () => {
    const formatted = formatCompactTimestamp('2026-11-21T07:00:00Z');
    assert.ok(formatted.length > 0);
    assert.strictEqual(formatCompactTimestamp('not-a-date'), 'not-a-date');
  });
});
