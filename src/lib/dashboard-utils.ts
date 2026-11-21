// src/lib/dashboard-utils.ts
// Pure sorting, filtering, pagination, and configuration diff helpers shared by dashboard views.

import type { Check, CheckerConfiguration } from './types';

export type SortDirection = 'asc' | 'desc';

export interface CheckSortConfig {
  key: keyof Check;
  direction: SortDirection;
}

export type CheckStatusFilter = 'all' | 'found' | 'notfound';

/** Sort check records by a given field while keeping null values last. */
export function sortChecks(checks: Check[], sortConfig: CheckSortConfig | null): Check[] {
  if (!sortConfig) {
    return [...checks];
  }
  const { key, direction } = sortConfig;
  return [...checks].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (typeof aValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(String(bValue))
        : String(bValue).localeCompare(aValue);
    }
    if (typeof aValue === 'boolean') {
      return direction === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    }
    return direction === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });
}

/** Filter check records by availability status. */
export function filterChecks(checks: Check[], statusFilter: CheckStatusFilter): Check[] {
  if (statusFilter === 'all') {
    return checks;
  }
  return checks.filter((check) => (statusFilter === 'found' ? check.hasContent : !check.hasContent));
}

/** Compute a diff payload containing only fields modified compared to the original configuration. */
export function buildConfigUpdatePayload(
  original: CheckerConfiguration,
  updated: CheckerConfiguration
): Partial<CheckerConfiguration> {
  const payload: Partial<CheckerConfiguration> = {};
  const editableKeys: Array<keyof Omit<CheckerConfiguration, 'id'>> = [
    'is_active',
    'targetDate',
    'targetLabel',
    'targetUrl',
    'is_mail_alert',
    'mail_alert_address',
    'mail_alert_contact',
  ];

  for (const key of editableKeys) {
    const currentValue = updated[key] ?? '';
    const originalValue = original[key] ?? '';
    if (String(currentValue) !== String(originalValue)) {
      (payload as Record<string, unknown>)[key] = updated[key];
    }
  }

  return payload;
}

/** Format an ISO timestamp into a compact, readable date-time string. */
export function formatCompactTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
