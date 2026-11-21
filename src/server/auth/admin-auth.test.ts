import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getCookieValue,
  isAuthExemptApiPath,
  isAuthorizedApiRequest,
  isPublicReadOnlyApiRequest,
  verifyAdminPassword,
  verifySessionToken,
} from './admin-auth.ts';

describe('Admin Authentication', () => {
  const originalPassword = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'correct-admin-password-123';
  });

  afterEach(() => {
    if (originalPassword !== undefined) {
      process.env.ADMIN_PASSWORD = originalPassword;
    } else {
      delete process.env.ADMIN_PASSWORD;
    }
  });

  describe('verifyAdminPassword', () => {
    it('should accept the correct password', async () => {
      assert.strictEqual(await verifyAdminPassword('correct-admin-password-123'), true);
    });

    it('should reject a wrong password', async () => {
      assert.strictEqual(await verifyAdminPassword('wrong-password'), false);
    });

    it('should fail closed when ADMIN_PASSWORD is not configured', async () => {
      delete process.env.ADMIN_PASSWORD;
      assert.strictEqual(await verifyAdminPassword('correct-admin-password-123'), false);
      assert.strictEqual(await verifyAdminPassword(''), false);
    });
  });

  describe('session tokens', () => {
    it('should verify a freshly created session token', async () => {
      const token = await createSessionToken();
      assert.ok(token);
      assert.strictEqual(await verifySessionToken(token), true);
    });

    it('should reject an expired session token', async () => {
      const token = await createSessionToken(-60);
      assert.ok(token);
      assert.strictEqual(await verifySessionToken(token), false);
    });

    it('should reject a tampered signature', async () => {
      const token = await createSessionToken();
      assert.ok(token);
      const [expiry] = token!.split('.');
      const tampered = `${expiry}.${'0'.repeat(64)}`;
      assert.strictEqual(await verifySessionToken(tampered), false);
    });

    it('should reject malformed tokens', async () => {
      assert.strictEqual(await verifySessionToken('no-dot'), false);
      assert.strictEqual(await verifySessionToken('a.b.c'), false);
      assert.strictEqual(await verifySessionToken(null), false);
      assert.strictEqual(await verifySessionToken(undefined), false);
    });

    it('should fail closed when ADMIN_PASSWORD is not configured', async () => {
      delete process.env.ADMIN_PASSWORD;
      assert.strictEqual(await createSessionToken(), null);
      assert.strictEqual(await verifySessionToken('123.abc'), false);
    });
  });

  describe('isAuthorizedApiRequest', () => {
    it('should authorize a request carrying a valid session cookie', async () => {
      const token = await createSessionToken();
      assert.ok(token);
      const request = new Request('http://localhost:3000/api/get-checks', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });
      assert.strictEqual(await isAuthorizedApiRequest(request), true);
    });

    it('should reject a request without cookie', async () => {
      const request = new Request('http://localhost:3000/api/get-checks');
      assert.strictEqual(await isAuthorizedApiRequest(request), false);
    });

    it('should reject a request with an invalid session cookie', async () => {
      const request = new Request('http://localhost:3000/api/get-checks', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=1234567.deadbeef` },
      });
      assert.strictEqual(await isAuthorizedApiRequest(request), false);
    });
  });

  describe('getCookieValue', () => {
    it('should extract the cookie among several entries', () => {
      const request = new Request('http://localhost:3000/', {
        headers: { cookie: `other=1; ${SESSION_COOKIE_NAME}=tok.en; last=2` },
      });
      assert.strictEqual(getCookieValue(request, SESSION_COOKIE_NAME), 'tok.en');
    });

    it('should return null when the header is absent', () => {
      const request = new Request('http://localhost:3000/');
      assert.strictEqual(getCookieValue(request, SESSION_COOKIE_NAME), null);
    });
  });

  describe('isAuthExemptApiPath', () => {
    it('should exempt auth management routes and the self-guarded scheduler', () => {
      assert.strictEqual(isAuthExemptApiPath('/api/auth/login'), true);
      assert.strictEqual(isAuthExemptApiPath('/api/auth/session'), true);
      assert.strictEqual(isAuthExemptApiPath('/api/auth/logout'), true);
      assert.strictEqual(isAuthExemptApiPath('/api/scheduler'), true);
    });

    it('should not exempt protected API routes', () => {
      assert.strictEqual(isAuthExemptApiPath('/api/update-checker-configuration'), false);
      assert.strictEqual(isAuthExemptApiPath('/api/force-check'), false);
      assert.strictEqual(isAuthExemptApiPath('/api/delete-check-content'), false);
      assert.strictEqual(isAuthExemptApiPath('/api/clear-cache'), false);
    });
  });

  describe('isPublicReadOnlyApiRequest', () => {
    it('should allow GET requests to public dashboard read-only routes', () => {
      for (const pathname of [
        '/api/get-checks',
        '/api/get-check-content?check_id=1',
        '/api/get-checker-configuration?isActiveOnly=true',
        '/api/get-db-usage',
      ]) {
        const req = new Request(`http://localhost:3000${pathname}`, { method: 'GET' });
        assert.strictEqual(isPublicReadOnlyApiRequest(req), true, `expected GET ${pathname} to be public`);
      }
    });

    it('should reject non-GET requests to read-only routes', () => {
      const postReq = new Request('http://localhost:3000/api/get-checks', { method: 'POST' });
      assert.strictEqual(isPublicReadOnlyApiRequest(postReq), false);
    });

    it('should reject all mutating admin routes regardless of HTTP method', () => {
      for (const pathname of [
        '/api/update-checker-configuration',
        '/api/create-checker-configuration',
        '/api/delete-checker-configuration',
        '/api/delete-check-content',
        '/api/force-check',
        '/api/clear-cache',
      ]) {
        const postReq = new Request(`http://localhost:3000${pathname}`, { method: 'POST' });
        const getReq = new Request(`http://localhost:3000${pathname}`, { method: 'GET' });
        assert.strictEqual(isPublicReadOnlyApiRequest(postReq), false);
        assert.strictEqual(isPublicReadOnlyApiRequest(getReq), false);
      }
    });
  });
});
