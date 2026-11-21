// src/server/service/checker-configuration-service.ts
// Cloudflare D1 persistence for checker configurations.

import { getDatabase, type D1Database } from '../db/d1.ts';

export interface CheckerConfigurationRecord {
  id: number;
  is_active: boolean | number;
  target_date: string;
  target_label: string;
  target_url?: string | null;
  is_mail_alert: boolean | number;
  mail_alert_address: string | null;
  mail_alert_contact: string | null;
  created_at?: string;
  updated_at?: string;
}

function normalizeConfigRecord(record: CheckerConfigurationRecord): CheckerConfigurationRecord {
  return {
    ...record,
    target_url: record.target_url ?? null,
    is_active: Boolean(record.is_active),
    is_mail_alert: Boolean(record.is_mail_alert),
  };
}

/**
 * Execute a D1 write operation that touches `target_url`, automatically applying
 * the column migration if the remote D1 table has not yet been migrated.
 */
async function withTargetUrlColumnFallback<T>(db: D1Database, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('no such column: target_url') || message.includes('has no column named target_url')) {
      await db.exec('ALTER TABLE checker_configurations ADD COLUMN target_url TEXT;');
      return await operation();
    }
    throw error;
  }
}

export async function getConfigurations(isActiveOnly = true): Promise<CheckerConfigurationRecord[]> {
  try {
    const db = getDatabase();
    const query = isActiveOnly
      ? 'SELECT * FROM checker_configurations WHERE is_active = 1 ORDER BY id ASC'
      : 'SELECT * FROM checker_configurations ORDER BY id ASC';
    const { results } = await db.prepare(query).all<CheckerConfigurationRecord>();
    console.info(`Data fetched from Cloudflare D1 with query: ${query} (count: ${results.length})`);
    return results.map(normalizeConfigRecord);
  } catch (error) {
    console.error('Unexpected error fetching configurations:', error);
    throw error;
  }
}

export async function createConfiguration(fields: {
  is_active?: boolean;
  target_date: string;
  target_label: string;
  target_url?: string | null;
  is_mail_alert?: boolean;
  mail_alert_address?: string | null;
  mail_alert_contact?: string | null;
}): Promise<CheckerConfigurationRecord> {
  try {
    const db = getDatabase();
    return await withTargetUrlColumnFallback(db, async () => {
      const sql = `
        INSERT INTO checker_configurations (
          is_active, target_date, target_label, target_url,
          is_mail_alert, mail_alert_address, mail_alert_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await db
        .prepare(sql)
        .bind(
          fields.is_active === false ? 0 : 1,
          fields.target_date,
          fields.target_label,
          fields.target_url ?? null,
          fields.is_mail_alert ? 1 : 0,
          fields.mail_alert_address ?? null,
          fields.mail_alert_contact ?? null
        )
        .run();

      const created = await db
        .prepare('SELECT * FROM checker_configurations ORDER BY id DESC LIMIT 1')
        .first<CheckerConfigurationRecord>();

      if (!created) {
        throw new Error('Failed to retrieve newly created configuration');
      }

      console.info(`Configuration ${created.id} created successfully in Cloudflare D1`);
      return normalizeConfigRecord(created);
    });
  } catch (error) {
    console.error('Error creating configuration:', error);
    throw error;
  }
}

export async function updateConfiguration(
  id: number,
  updatedFields: Record<string, unknown>
): Promise<CheckerConfigurationRecord> {
  try {
    const db = getDatabase();
    const allowedKeys = [
      'is_active',
      'target_date',
      'target_label',
      'target_url',
      'is_mail_alert',
      'mail_alert_address',
      'mail_alert_contact',
    ];

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updatedFields)) {
      if (allowedKeys.includes(key)) {
        setClauses.push(`${key} = ?`);
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    return await withTargetUrlColumnFallback(db, async () => {
      if (setClauses.length > 0) {
        const clausesWithTimestamp = [...setClauses, "updated_at = datetime('now')"];
        const sql = `UPDATE checker_configurations SET ${clausesWithTimestamp.join(', ')} WHERE id = ?`;
        await db.prepare(sql).bind(...values, id).run();
      }

      const updated = await db
        .prepare('SELECT * FROM checker_configurations WHERE id = ?')
        .bind(id)
        .first<CheckerConfigurationRecord>();

      if (!updated) {
        throw new Error('Configuration not found or no changes made');
      }

      console.info(`Configuration ${id} updated successfully in Cloudflare D1`);
      return normalizeConfigRecord(updated);
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
}

export async function deleteConfiguration(id: number): Promise<{ id: number } | null> {
  try {
    const db = getDatabase();
    const existing = await db
      .prepare('SELECT id FROM checker_configurations WHERE id = ?')
      .bind(id)
      .first<{ id: number }>();

    if (!existing) {
      return null;
    }

    await db.prepare('DELETE FROM checker_configurations WHERE id = ?').bind(id).run();
    console.info(`Configuration ${id} deleted from Cloudflare D1`);
    return { id: existing.id };
  } catch (error) {
    console.error('Error deleting configuration:', error);
    throw error;
  }
}
