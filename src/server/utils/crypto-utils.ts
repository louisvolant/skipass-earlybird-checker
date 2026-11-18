// src/server/utils/crypto-utils.ts
// Web Crypto helpers shared by all security-sensitive comparisons.
// Works identically in Cloudflare Workers and Node.js 20+ runtimes.

/**
 * Constant-time string comparison to prevent timing attacks on secrets.
 * Both values are digested to fixed-length SHA-256 hashes before comparison,
 * so response time does not leak the length or content of the expected value.
 */
export async function timingSafeEqualString(actual: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  if (actualBytes.length !== expectedBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < actualBytes.length; i++) {
    diff |= actualBytes[i] ^ expectedBytes[i];
  }
  return diff === 0;
}
