// src/server/utils/html-utils.ts
// Minimal HTML escaping for values interpolated into HTML email bodies.

/**
 * Escape a value for safe interpolation into HTML content.
 * Configuration fields (labels, contact names, dates, prices) are user
 * controlled and must never be injected into emails unescaped.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
