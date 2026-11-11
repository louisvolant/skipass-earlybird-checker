// src/server/service/checker-configuration-service.ts
// Cloudflare D1 persistence for checker configurations.

import { getDatabase } from '../db/d1.ts';

export interface CheckerConfigurationRecord {
  id: number;
  is_active: boolean | number;
  target_date: string;
  target_label: string;
  is_mail_alert: boolean | number;
  mail_alert_address: string;
  mail_alert_contact: string;
  created_at?: string;
  updated_at?: string;
}

export async function getConfigurations(isActiveOnly = true): Promise<CheckerConfigurationRecord[]> {
  try {
    const db = getDatabase();
    const query = isActiveOnly
      ? 'SELECT * FROM checker_configurations WHERE is_active = 1 ORDER BY id ASC'
      : 'SELECT * FROM checker_configurations ORDER BY id ASC';
    const { results } = await db.prepare(query).all<CheckerConfigurationRecord>();
    console.info(`Data fetched from Cloudflare D1 with query: ${query} (count: ${results.length})`);
    return results.map((config) => ({
      ...config,
      is_active: Boolean(config.is_active),
      is_mail_alert: Boolean(config.is_mail_alert),
    }));
  } catch (error) {
    console.error('Unexpected error fetching configurations:', error);
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

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      values.push(id);
      const sql = `UPDATE checker_configurations SET ${setClauses.join(', ')} WHERE id = ?`;
      await db.prepare(sql).bind(...values).run();
    }

    const updated = await db
      .prepare('SELECT * FROM checker_configurations WHERE id = ?')
      .bind(id)
      .first<CheckerConfigurationRecord>();

    if (!updated) {
      throw new Error('Configuration not found or no changes made');
    }

    console.info(`Configuration ${id} updated successfully in Cloudflare D1`);
    return {
      ...updated,
      is_active: Boolean(updated.is_active),
      is_mail_alert: Boolean(updated.is_mail_alert),
    };
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw error;
  }
}
