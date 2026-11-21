import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMAIL_MAX_LENGTH,
  FIELD_MAX_LENGTH,
  URL_MAX_LENGTH,
  isValidEmail,
  isValidTargetDate,
  isValidTargetLabel,
  isValidTargetUrl,
} from './validation.ts';

describe('Input Validation Helpers', () => {
  describe('isValidEmail', () => {
    it('should accept well-formed email addresses', () => {
      assert.strictEqual(isValidEmail('alerts@example.com'), true);
      assert.strictEqual(isValidEmail('first.last+tag@sub.domain.co'), true);
    });

    it('should reject malformed or dangerous values', () => {
      assert.strictEqual(isValidEmail(''), false);
      assert.strictEqual(isValidEmail('no-at-sign'), false);
      assert.strictEqual(isValidEmail('no@tld'), false);
      assert.strictEqual(isValidEmail('spaces @example.com'), false);
      assert.strictEqual(isValidEmail('a@b.c<script>alert(1)</script>'), false);
      assert.strictEqual(isValidEmail('a'.repeat(EMAIL_MAX_LENGTH) + '@example.com'), false);
      assert.strictEqual(isValidEmail(null), false);
      assert.strictEqual(isValidEmail(123), false);
    });
  });

  describe('isValidTargetDate', () => {
    it('should accept calendar dates in YYYY-MM-DD format', () => {
      assert.strictEqual(isValidTargetDate('2026-12-20'), true);
      assert.strictEqual(isValidTargetDate('2027-01-02'), true);
    });

    it('should reject non-ISO or impossible dates', () => {
      assert.strictEqual(isValidTargetDate('20/12/2026'), false);
      assert.strictEqual(isValidTargetDate('2026-13-45'), false);
      assert.strictEqual(isValidTargetDate('not-a-date'), false);
      assert.strictEqual(isValidTargetDate(''), false);
      assert.strictEqual(isValidTargetDate(null), false);
    });
  });

  describe('isValidTargetLabel', () => {
    it('should accept reasonable non-empty labels', () => {
      assert.strictEqual(isValidTargetLabel('Val Cenis'), true);
      assert.strictEqual(isValidTargetLabel('Pass Saison EarlyBird 2026/2027'), true);
    });

    it('should reject empty or oversized labels', () => {
      assert.strictEqual(isValidTargetLabel(''), false);
      assert.strictEqual(isValidTargetLabel('   '), false);
      assert.strictEqual(isValidTargetLabel('a'.repeat(FIELD_MAX_LENGTH + 1)), false);
      assert.strictEqual(isValidTargetLabel(null), false);
      assert.strictEqual(isValidTargetLabel(42), false);
    });

    it('should reject labels containing angle brackets', () => {
      assert.strictEqual(isValidTargetLabel('<img src=x onerror=alert(1)>'), false);
      assert.strictEqual(isValidTargetLabel('Pass <b>Special</b>'), false);
    });
  });

  describe('isValidTargetUrl', () => {
    it('should accept valid http and https URLs', () => {
      assert.strictEqual(isValidTargetUrl('https://shop.resort.com/fr/pass'), true);
      assert.strictEqual(isValidTargetUrl('http://localhost:3000/test?foo=bar'), true);
    });

    it('should reject invalid schemes, empty strings, and dangerous payloads', () => {
      assert.strictEqual(isValidTargetUrl(''), false);
      assert.strictEqual(isValidTargetUrl('   '), false);
      assert.strictEqual(isValidTargetUrl('javascript:alert(1)'), false);
      assert.strictEqual(isValidTargetUrl('ftp://example.com/file'), false);
      assert.strictEqual(isValidTargetUrl('not-a-url'), false);
      assert.strictEqual(isValidTargetUrl('https://example.com/<script>'), false);
      assert.strictEqual(isValidTargetUrl(`https://example.com/${'a'.repeat(URL_MAX_LENGTH)}`), false);
      assert.strictEqual(isValidTargetUrl(null), false);
    });
  });
});
