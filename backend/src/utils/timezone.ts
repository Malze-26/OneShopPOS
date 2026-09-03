/**
 * Every "today"/"this month"/daily-breakdown calculation in the app must agree
 * on what day a timestamp falls on. Relying on the server process's local
 * timezone (or Mongo's UTC default for $dateToString/$hour) silently drifts
 * from what the frontend shows the user (browser-local time), so all
 * calendar-boundary math is pinned to a single fixed offset instead: the
 * store's timezone, +05:30 (Sri Lanka / India), which does not observe DST.
 */

export const STORE_TZ_OFFSET = '+05:30';
const STORE_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Shifts a Date so its UTC getters/formatters read as store-local wall-clock time. */
function toStoreShifted(date: Date): Date {
  return new Date(date.getTime() + STORE_OFFSET_MS);
}

/** The UTC instant of 00:00:00.000 store-local time, for the day `date` falls on. */
export function startOfStoreDay(date: Date = new Date()): Date {
  const shifted = toStoreShifted(date);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - STORE_OFFSET_MS);
}

/** The UTC instant of 23:59:59.999 store-local time, for the day `date` falls on. */
export function endOfStoreDay(date: Date = new Date()): Date {
  return new Date(startOfStoreDay(date).getTime() + DAY_MS - 1);
}

/** The UTC instant of the 1st of the month, 00:00:00.000 store-local time. */
export function startOfStoreMonth(date: Date = new Date()): Date {
  const shifted = toStoreShifted(date);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - STORE_OFFSET_MS);
}

/** `date` shifted by whole calendar months, store-local. */
export function addStoreMonths(date: Date, months: number): Date {
  const shifted = toStoreShifted(date);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  return new Date(shifted.getTime() - STORE_OFFSET_MS);
}

/** The last instant of the month `date` falls in, store-local. */
export function endOfStoreMonth(date: Date = new Date()): Date {
  return new Date(startOfStoreMonth(addStoreMonths(date, 1)).getTime() - 1);
}

/** `date` shifted by whole days — safe because the fixed offset never observes DST. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** The calendar year `date` falls in, store-local. */
export function storeYear(date: Date = new Date()): number {
  return toStoreShifted(date).getUTCFullYear();
}

/** The UTC instant of Jan 1st, 00:00:00.000 store-local time, for the given store-local year. */
export function startOfStoreYear(year: number): Date {
  return startOfStoreDay(new Date(Date.UTC(year, 0, 1)));
}

/** 'YYYY-MM-DD' for `date` in store-local time — matches the frontend's day grouping. */
export function storeDateKey(date: Date = new Date()): string {
  return toStoreShifted(date).toISOString().slice(0, 10);
}

/** Formats `date` in store-local time, independent of the server's own timezone. */
export function formatStoreDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  return toStoreShifted(date).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}

/** Formats a time-of-day in store-local time, independent of the server's own timezone. */
export function formatStoreTime(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  return toStoreShifted(date).toLocaleTimeString(locale, { ...options, timeZone: 'UTC' });
}
