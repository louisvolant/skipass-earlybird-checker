// src/server/utils/validation.ts
// Input validation helpers for API payloads holding customer data.
// All helpers fail closed: anything that is not explicitly valid is rejected.

export const EMAIL_MAX_LENGTH = 254;
export const FIELD_MAX_LENGTH = 100;
export const URL_MAX_LENGTH = 500;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// Pragmatic email validation restricted to characters legal in addresses and
// hostnames, so hostile payloads (HTML tags, control chars, spaces) are
// rejected before ever reaching the database or the mailer.
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_REGEX.test(value)
  );
}

export function isValidTargetDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    return false;
  }
  // Reject impossible calendar dates such as 2026-13-45.
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

export function isValidTargetLabel(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= FIELD_MAX_LENGTH &&
    // Defense in depth: labels and contact names never legitimately contain
    // angle brackets. Output escaping remains the primary safeguard.
    !/[<>]/.test(value)
  );
}

/**
 * Validate a target site URL for the resort checker.
 * Accepts only well-formed http/https URLs with a non-empty hostname.
 */
export function isValidTargetUrl(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > URL_MAX_LENGTH ||
    /[\s<>]/.test(value.trim())
  ) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
