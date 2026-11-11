// src/server/service/checker-history-service.ts
// Cloudflare D1 persistence for checker execution history.

import { getDatabase } from '../db/d1.ts';

export interface CheckerHistoryRecord {
  id: number;
  created_at: string;
  http_code: string;
  full_url: string;
  target_date: string;
  target_label: string;
  price: number | null;
  response_text?: string | null;
}

/**
 * Retrieve check list history.
 * Adds a default limit to prevent unbounded memory growth.
 */
export async function getCheckList(limit = 100): Promise<Omit<CheckerHistoryRecord, 'response_text'>[]> {
  try {
    const db = getDatabase();
    const query = `
      SELECT id, created_at, http_code, full_url, target_date, target_label, price
      FROM checker_history
      ORDER BY id DESC
      LIMIT ?
    `;
    const { results } = await db.prepare(query).bind(limit).all<Omit<CheckerHistoryRecord, 'response_text'>>();
    console.info(
      results && results.length > 0
        ? `Data (CheckerHistory) fetched from Cloudflare D1 (${results.length} rows)`
        : 'No Data (CheckerHistory) fetched from Cloudflare D1'
    );
    return results;
  } catch (error) {
    console.error('Unexpected error fetching check list:', error);
    throw error;
  }
}

/**
 * Retrieve specific check content by ID.
 */
export async function getCheckContent(check_id: number): Promise<CheckerHistoryRecord | null> {
  try {
    const db = getDatabase();
    const query = 'SELECT * FROM checker_history WHERE id = ?';
    const result = await db.prepare(query).bind(check_id).first<CheckerHistoryRecord>();
    console.info(
      result
        ? `Data (CheckerHistory id: ${check_id}) fetched from Cloudflare D1`
        : `No Data (CheckerHistory id: ${check_id}) fetched from Cloudflare D1`
    );
    return result || null;
  } catch (error) {
    console.error('Unexpected error fetching check content:', error);
    throw error;
  }
}

// Maximum length (50,000 chars) for stored raw HTML response to avoid heavy serialization
// and memory consumption in Cloudflare Workers V8 isolates
export const MAX_RESPONSE_TEXT_LENGTH = 50_000;

export function sanitizeResponseText(
  text: string | null | undefined,
  maxLength = MAX_RESPONSE_TEXT_LENGTH
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n<!-- [Content truncated to ${maxLength} characters to optimize Worker CPU and storage] -->`;
}

export async function saveCheckContent(
  input_http_code: string,
  input_full_url: string,
  input_target_date: string,
  input_target_label: string,
  input_price: string | number | null,
  input_response_text: string
): Promise<void> {
  try {
    const db = getDatabase();
    const createdAt = new Date().toISOString();
    const numericPrice = input_price != null ? Number(input_price) : null;
    const sanitizedResponse = sanitizeResponseText(input_response_text);

    const query = `
      INSERT INTO checker_history (created_at, http_code, full_url, target_date, target_label, price, response_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db
      .prepare(query)
      .bind(
        createdAt,
        input_http_code,
        input_full_url,
        input_target_date,
        input_target_label,
        numericPrice,
        sanitizedResponse
      )
      .run();

    console.info(`Data (CheckerHistory) saved to Cloudflare D1 for ${input_target_label}`);
  } catch (error) {
    console.error('Unexpected error saving CheckerContent data to Cloudflare D1:', error);
    throw error;
  }
}

export async function deleteCheckContent(checkId: number): Promise<{ id: number } | null> {
  try {
    const db = getDatabase();
    const existing = await db
      .prepare('SELECT id FROM checker_history WHERE id = ?')
      .bind(checkId)
      .first<{ id: number }>();

    if (!existing) {
      console.info(`No check found with ID: ${checkId} in Cloudflare D1`);
      return null;
    }

    await db.prepare('DELETE FROM checker_history WHERE id = ?').bind(checkId).run();
    console.info(`Check with ID: ${checkId} deleted from Cloudflare D1`);
    return existing;
  } catch (error) {
    console.error('Error deleting check from Cloudflare D1:', error);
    throw error;
  }
}
