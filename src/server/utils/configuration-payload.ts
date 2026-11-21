// src/server/utils/configuration-payload.ts
// Shared validation and response formatting for checker configuration routes.

import type { CheckerConfigurationRecord } from '../service/checker-configuration-service.ts';
import { maskContact, maskEmail } from './mail-utils.ts';
import {
  isValidEmail,
  isValidTargetDate,
  isValidTargetLabel,
  isValidTargetUrl,
} from './validation.ts';

export interface ConfigurationRequestPayload {
  id?: unknown;
  is_active?: unknown;
  targetDate?: unknown;
  targetLabel?: unknown;
  targetUrl?: unknown;
  is_mail_alert?: unknown;
  mail_alert_address?: unknown;
  mail_alert_contact?: unknown;
}

export interface FormattedConfiguration {
  id: number;
  is_active: boolean;
  targetDate: string;
  targetLabel: string;
  targetUrl: string;
  is_mail_alert: boolean;
  mail_alert_address: string;
  mail_alert_contact: string;
}

/** Format a D1 configuration record for API JSON responses, masking PII for public callers. */
export function formatConfigurationResponse(
  config: CheckerConfigurationRecord,
  includeFullPii: boolean
): FormattedConfiguration {
  return {
    id: config.id,
    is_active: Boolean(config.is_active),
    targetDate: config.target_date,
    targetLabel: config.target_label,
    targetUrl: config.target_url || '',
    is_mail_alert: Boolean(config.is_mail_alert),
    mail_alert_address: includeFullPii
      ? config.mail_alert_address || ''
      : maskEmail(config.mail_alert_address),
    mail_alert_contact: includeFullPii
      ? config.mail_alert_contact || ''
      : maskContact(config.mail_alert_contact),
  };
}

/**
 * Validate and map incoming configuration fields to D1 column values.
 * Returns either a validation error message or sanitized database fields.
 */
export function validateAndMapConfigurationFields(
  fields: ConfigurationRequestPayload,
  options: { requireRequiredFields: boolean }
): { error?: string; dbFields?: Record<string, unknown> } {
  if (options.requireRequiredFields) {
    if (!isValidTargetDate(fields.targetDate)) {
      return { error: 'Invalid targetDate: YYYY-MM-DD expected' };
    }
    if (!isValidTargetLabel(fields.targetLabel)) {
      return { error: 'Invalid targetLabel: non-empty text of 100 characters max expected' };
    }
  }

  if ('is_active' in fields && typeof fields.is_active !== 'boolean') {
    return { error: 'Invalid is_active: boolean expected' };
  }
  if ('is_mail_alert' in fields && typeof fields.is_mail_alert !== 'boolean') {
    return { error: 'Invalid is_mail_alert: boolean expected' };
  }
  if ('targetDate' in fields && !isValidTargetDate(fields.targetDate)) {
    return { error: 'Invalid targetDate: YYYY-MM-DD expected' };
  }
  if ('targetLabel' in fields && !isValidTargetLabel(fields.targetLabel)) {
    return { error: 'Invalid targetLabel: non-empty text of 100 characters max expected' };
  }
  if ('targetUrl' in fields) {
    const url = fields.targetUrl;
    if (url !== '' && url !== null && !isValidTargetUrl(url)) {
      return { error: 'Invalid targetUrl: valid http or https URL expected' };
    }
  }
  if ('mail_alert_contact' in fields) {
    const contact = fields.mail_alert_contact;
    const isEmptyAllowed = !options.requireRequiredFields
      ? false
      : fields.is_mail_alert !== true && (contact === '' || contact === null);
    if (!isEmptyAllowed && !isValidTargetLabel(contact)) {
      return { error: 'Invalid mail_alert_contact: non-empty text of 100 characters max expected' };
    }
  }
  if ('mail_alert_address' in fields) {
    const address = fields.mail_alert_address;
    // An empty address clears the alert recipient; any other value must be a
    // well-formed email address so alerts cannot be silently redirected.
    if (address !== '' && address !== null && !isValidEmail(address)) {
      return { error: 'Invalid mail_alert_address: valid email address expected' };
    }
  }

  const dbFields: Record<string, unknown> = {};
  if ('is_active' in fields) dbFields.is_active = fields.is_active;
  if ('targetDate' in fields) dbFields.target_date = fields.targetDate;
  if ('targetLabel' in fields) dbFields.target_label = (fields.targetLabel as string).trim();
  if ('targetUrl' in fields) {
    dbFields.target_url = typeof fields.targetUrl === 'string' && fields.targetUrl.trim()
      ? fields.targetUrl.trim()
      : null;
  }
  if ('is_mail_alert' in fields) dbFields.is_mail_alert = fields.is_mail_alert;
  if ('mail_alert_address' in fields) {
    dbFields.mail_alert_address = fields.mail_alert_address || null;
  }
  if ('mail_alert_contact' in fields) {
    dbFields.mail_alert_contact = typeof fields.mail_alert_contact === 'string' && fields.mail_alert_contact.trim()
      ? fields.mail_alert_contact.trim()
      : null;
  }

  return { dbFields };
}
