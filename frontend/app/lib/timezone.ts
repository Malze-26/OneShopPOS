/**
 * OneShop is a single-store app whose backend buckets every "today" / daily
 * report / trend chart by a fixed store timezone (+05:30 — see
 * backend/src/utils/timezone.ts). Formatting dates here with the browser's
 * own local timezone would drift from those backend day-boundaries whenever
 * a device isn't set to +05:30, so all display of stored timestamps goes
 * through this fixed zone instead.
 */

export const STORE_TIMEZONE = 'Asia/Colombo';

export function formatStoreDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-US'
): string {
  return new Date(date).toLocaleDateString(locale, { ...options, timeZone: STORE_TIMEZONE });
}

export function formatStoreTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  locale = 'en-US'
): string {
  return new Date(date).toLocaleTimeString(locale, { ...options, timeZone: STORE_TIMEZONE });
}
