// src/server/auth/admin-auth.ts
// Admin authentication for API routes: password verification, HMAC-signed
// session tokens, and authorization checks enforced by the Worker entrypoint
// (src/server/worker-handler.ts) before requests reach Next.js route handlers.

import { timingSafeEqualString } from '../utils/crypto-utils.ts';

export const SESSION_COOKIE_NAME = 'admin_session';
// Session lifetime: 7 days. Rotating ADMIN_PASSWORD invalidates every session
// because the signing key is derived from the password itself.
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

export interface AdminAuthEnv {
  ADMIN_PASSWORD?: unknown;
  [key: string]: unknown;
}

function getAdminPassword(env?: AdminAuthEnv): string | null {
  // Prefer the Worker env binding, fall back to process.env for Node tests.
  const candidate = env?.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}

/**
 * Verify an admin login password against ADMIN_PASSWORD.
 * Fails closed: when ADMIN_PASSWORD is not configured, no password is accepted.
 */
export async function verifyAdminPassword(password: string, env?: AdminAuthEnv): Promise<boolean> {
  const expected = getAdminPassword(env);
  if (!expected) {
    return false;
  }
  return timingSafeEqualString(password, expected);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
}

/**
 * Create an HMAC-signed session token in the format "<expiry>.<signature>".
 * Returns null when ADMIN_PASSWORD is not configured (fail closed).
 */
export async function createSessionToken(
  ttlSeconds: number = SESSION_TTL_SECONDS,
  env?: AdminAuthEnv
): Promise<string | null> {
  const secret = getAdminPassword(env);
  if (!secret) {
    return null;
  }
  const expiry = Date.now() + ttlSeconds * 1000;
  const payload = String(expiry);
  return `${payload}.${await hmacSign(payload, secret)}`;
}

/**
 * Verify an HMAC-signed session token: signature first (constant-time),
 * then expiry. Fails closed on malformed tokens or missing configuration.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  env?: AdminAuthEnv
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const secret = getAdminPassword(env);
  if (!secret) {
    return false;
  }
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) {
    return false;
  }
  const expectedSignature = await hmacSign(expiry, secret);
  if (!(await timingSafeEqualString(signature, expectedSignature))) {
    return false;
  }
  const expiryMs = Number(expiry);
  return Number.isFinite(expiryMs) && expiryMs > Date.now();
}

/** Extract a named cookie value from a Cookie header (no external deps). */
export function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}

/**
 * Check whether an incoming request is authorized to access protected API routes.
 * Authorization relies on the signed HttpOnly session cookie issued by
 * POST /api/auth/login.
 */
export async function isAuthorizedApiRequest(request: Request, env?: AdminAuthEnv): Promise<boolean> {
  return verifySessionToken(getCookieValue(request, SESSION_COOKIE_NAME), env);
}

/**
 * API paths that manage authentication themselves and bypass the admin gate:
 * - /api/auth/* issue or inspect the session themselves (no PII exposed),
 * - /api/scheduler is invoked by the cron trigger and enforces its own
 *   CRON_SECRET bearer authorization inside the route handler.
 */
export function isAuthExemptApiPath(pathname: string): boolean {
  return (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/session' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/scheduler'
  );
}

const PUBLIC_READONLY_API_PATHS = new Set([
  '/api/get-checks',
  '/api/get-check-content',
  '/api/get-checker-configuration',
  '/api/get-db-usage',
]);

/**
 * Check whether an incoming API request targets a public read-only dashboard
 * endpoint. Only GET requests are allowed without an admin session; all
 * mutating endpoints and non-GET requests remain protected.
 */
export function isPublicReadOnlyApiRequest(request: Request): boolean {
  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }
  const { pathname } = new URL(request.url);
  return PUBLIC_READONLY_API_PATHS.has(pathname);
}
