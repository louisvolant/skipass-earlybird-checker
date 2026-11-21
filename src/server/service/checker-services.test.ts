import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCheckList,
  getCheckContent,
  saveCheckContent,
  deleteCheckContent,
  sanitizeResponseText,
  MAX_RESPONSE_TEXT_LENGTH,
} from './checker-history-service.ts';
import {
  createConfiguration,
  deleteConfiguration,
  getConfigurations,
  updateConfiguration,
} from './checker-configuration-service.ts';
import { resetInMemoryD1Database, setMockD1Database } from '../db/d1.ts';

describe('Checker Services Cloudflare D1 Integration', () => {
  beforeEach(() => {
    setMockD1Database(null);
    resetInMemoryD1Database();
  });

  it('should export all required service methods', () => {
    assert.strictEqual(typeof getCheckList, 'function');
    assert.strictEqual(typeof getCheckContent, 'function');
    assert.strictEqual(typeof saveCheckContent, 'function');
    assert.strictEqual(typeof deleteCheckContent, 'function');
    assert.strictEqual(typeof getConfigurations, 'function');
    assert.strictEqual(typeof updateConfiguration, 'function');
  });

  it('should fetch seeded configurations from D1', async () => {
    const configs = await getConfigurations(false);
    assert.ok(configs.length >= 1, 'Should have at least 1 seeded configuration');
    assert.strictEqual(configs[0].id, 1);
    assert.strictEqual(configs[0].target_label, 'Val Cenis');
    assert.strictEqual(configs[0].is_active, true);
  });

  it('should filter active configurations when isActiveOnly is true', async () => {
    // Deactivate config 1
    await updateConfiguration(1, { is_active: false });

    const activeOnly = await getConfigurations(true);
    assert.strictEqual(activeOnly.length, 0);

    const allConfigs = await getConfigurations(false);
    assert.strictEqual(allConfigs.length, 1);
    assert.strictEqual(allConfigs[0].is_active, false);
  });

  it('should update configuration fields including target_url in D1', async () => {
    const updated = await updateConfiguration(1, {
      target_date: '2026-12-25',
      target_label: 'Tignes',
      target_url: 'https://shop.tignes.net/passes',
      is_mail_alert: true,
      mail_alert_address: 'snow@resort.com',
    });

    assert.strictEqual(updated.target_date, '2026-12-25');
    assert.strictEqual(updated.target_label, 'Tignes');
    assert.strictEqual(updated.target_url, 'https://shop.tignes.net/passes');
    assert.strictEqual(updated.is_mail_alert, true);
    assert.strictEqual(updated.mail_alert_address, 'snow@resort.com');
  });

  it('should create and delete configurations with target_url in D1', async () => {
    const created = await createConfiguration({
      is_active: true,
      target_date: '2027-01-15',
      target_label: 'Les Arcs EarlyBird',
      target_url: 'https://shop.lesarcs.com/fr/skipass',
      is_mail_alert: false,
      mail_alert_address: null,
      mail_alert_contact: null,
    });

    assert.ok(created.id > 1);
    assert.strictEqual(created.target_url, 'https://shop.lesarcs.com/fr/skipass');
    assert.strictEqual(created.target_label, 'Les Arcs EarlyBird');

    const deleted = await deleteConfiguration(created.id);
    assert.deepStrictEqual(deleted, { id: created.id });

    const notFound = await deleteConfiguration(created.id);
    assert.strictEqual(notFound, null);
  });

  it('should throw error when updating non-existent configuration', async () => {
    await assert.rejects(async () => {
      await updateConfiguration(999999, { target_label: 'Nowhere' });
    }, /Configuration not found/);
  });

  it('should save, retrieve, and delete check history in D1', async () => {
    await saveCheckContent(
      '200',
      'https://resort.example.com/passes',
      '2026-12-20',
      'Val Thorens',
      49.5,
      '<html><body>Pass Available: €49.50</body></html>'
    );

    const checkList = await getCheckList();
    assert.ok(checkList.length >= 1);
    const saved = checkList.find((c) => c.target_label === 'Val Thorens');
    assert.ok(saved);
    assert.strictEqual(saved.http_code, '200');
    assert.strictEqual(saved.price, 49.5);

    // Retrieve check content
    const fullContent = await getCheckContent(saved.id);
    assert.ok(fullContent);
    assert.ok(fullContent.response_text?.includes('Pass Available: €49.50'));

    // Delete check content
    const deleted = await deleteCheckContent(saved.id);
    assert.ok(deleted);
    assert.strictEqual(deleted.id, saved.id);

    // Verify deletion
    const afterDelete = await getCheckContent(saved.id);
    assert.strictEqual(afterDelete, null);
  });

  it('should return null when deleting non-existent check', async () => {
    const result = await deleteCheckContent(888888);
    assert.strictEqual(result, null);
  });

  it('should sanitize and cap oversized HTML response strings', () => {
    assert.strictEqual(MAX_RESPONSE_TEXT_LENGTH, 50000);

    // Empty or falsy input
    assert.strictEqual(sanitizeResponseText(null), '');
    assert.strictEqual(sanitizeResponseText(''), '');

    // Under limit
    const smallText = '<html><body>Small page</body></html>';
    assert.strictEqual(sanitizeResponseText(smallText), smallText);

    // Over limit
    const hugeText = 'a'.repeat(60000);
    const sanitized = sanitizeResponseText(hugeText, 100);
    assert.ok(sanitized.startsWith('a'.repeat(100)));
    assert.ok(sanitized.includes('Content truncated to 100 characters'));
  });

  it('should propagate errors cleanly if DB query fails', async () => {
    setMockD1Database({
      prepare() {
        throw new Error('Simulated D1 connection error');
      },
      batch() {
        throw new Error('Simulated D1 connection error');
      },
      exec() {
        throw new Error('Simulated D1 connection error');
      },
    });

    await assert.rejects(async () => {
      await getConfigurations();
    }, /Simulated D1 connection error/);

    await assert.rejects(async () => {
      await getCheckList();
    }, /Simulated D1 connection error/);
  });
});
