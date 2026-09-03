/**
 * Date Range Utility Functions for Report Filtering
 * Supports preset date ranges: Today, Last 7 Days, This Month, Custom
 *
 * All boundaries are computed in the store's fixed +05:30 timezone rather
 * than the server process's own timezone, so "today"/"this month" here always
 * agrees with what the frontend (browser-local, Asia/Colombo) displays.
 */
import { addDays, addStoreMonths, startOfStoreDay, endOfStoreDay, startOfStoreMonth, endOfStoreMonth, startOfStoreYear, storeYear, formatStoreDate } from './timezone';

export type DateRangePreset = 'today' | 'last-7-days' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'last-year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get date range for a preset or custom dates
 * @param preset - Preset date range (today, last-7-days, this-month, etc.)
 * @param customStart - Custom start date (ISO string)
 * @param customEnd - Custom end date (ISO string)
 * @returns DateRange object with startDate and endDate
 */
export const getDateRange = (
  preset?: string,
  customStart?: string,
  customEnd?: string
): DateRange => {
  const now = new Date();

  // Handle custom date range
  if (preset === 'custom' || customStart) {
    const startDate = startOfStoreDay(customStart ? new Date(customStart) : now);
    const endDate = endOfStoreDay(customEnd ? new Date(customEnd) : startDate);
    return { startDate, endDate };
  }

  // Handle preset ranges
  switch (preset?.toLowerCase()) {
    case 'today':
      return { startDate: startOfStoreDay(now), endDate: endOfStoreDay(now) };

    case 'last-7-days':
      return { startDate: startOfStoreDay(addDays(now, -7)), endDate: endOfStoreDay(now) };

    case 'this-month':
      return { startDate: startOfStoreMonth(now), endDate: endOfStoreMonth(now) };

    case 'last-month': {
      const lastMonth = addStoreMonths(now, -1);
      return { startDate: startOfStoreMonth(lastMonth), endDate: endOfStoreMonth(lastMonth) };
    }

    case 'last-3-months':
      return { startDate: startOfStoreMonth(addStoreMonths(now, -3)), endDate: endOfStoreMonth(now) };

    case 'last-6-months':
      return { startDate: startOfStoreMonth(addStoreMonths(now, -6)), endDate: endOfStoreMonth(now) };

    case 'last-year':
      return { startDate: startOfStoreYear(storeYear(now) - 1), endDate: endOfStoreMonth(now) };

    // Default to today
    default:
      return { startDate: startOfStoreDay(now), endDate: endOfStoreDay(now) };
  }
};

/**
 * Build MongoDB date filter for queries
 * @param preset - Preset date range
 * @param customStart - Custom start date (ISO string)
 * @param customEnd - Custom end date (ISO string)
 * @returns MongoDB $match filter object
 */
export const buildDateFilter = (
  preset?: string,
  customStart?: string,
  customEnd?: string
): any => {
  if (preset?.toLowerCase() === 'all-time') {
    return {};
  }
  const { startDate, endDate } = getDateRange(preset, customStart, customEnd);
  return {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
};

/**
 * Get human-readable date range string
 * @param preset - Preset date range
 * @param customStart - Custom start date
 * @param customEnd - Custom end date
 * @returns Formatted date range string
 */
export const getDateRangeLabel = (
  preset?: string,
  customStart?: string,
  customEnd?: string
): string => {
  const { startDate, endDate } = getDateRange(preset, customStart, customEnd);

  const formatDate = (date: Date) => formatStoreDate(date, { year: 'numeric', month: 'short', day: 'numeric' });

  if (customStart || customEnd) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  switch (preset?.toLowerCase()) {
    case 'today':
      return 'Today';
    case 'last-7-days':
      return 'Last 7 Days';
    case 'this-month':
      return 'This Month';
    case 'last-month':
      return 'Last Month';
    case 'last-3-months':
      return 'Last 3 Months';
    case 'last-6-months':
      return 'Last 6 Months';
    case 'last-year':
      return 'Last Year';
    default:
      return 'All Time';
  }
};

/**
 * Get date range statistics
 * @param preset - Preset date range
 * @returns Object with start, end dates and day count
 */
export const getDateRangeStats = (preset?: string) => {
  const { startDate, endDate } = getDateRange(preset);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    startDate,
    endDate,
    dayCount,
    label: getDateRangeLabel(preset),
  };
};
