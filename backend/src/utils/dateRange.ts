/**
 * Date Range Utility Functions for Report Filtering
 * Supports preset date ranges: Today, Last 7 Days, This Month, Custom
 */

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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle custom date range
  if (preset === 'custom' || customStart) {
    const startDate = customStart ? new Date(customStart) : today;
    startDate.setHours(0, 0, 0, 0);

    const endDate = customEnd ? new Date(customEnd) : new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // Handle preset ranges
  switch (preset?.toLowerCase()) {
    case 'today':
      return {
        startDate: new Date(today.getTime()),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'last-7-days':
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: sevenDaysAgo,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'this-month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case 'last-month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return {
        startDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        endDate: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case 'last-3-months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return {
        startDate: threeMonthsAgo,
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case 'last-6-months':
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return {
        startDate: sixMonthsAgo,
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case 'last-year':
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      return {
        startDate: lastYear,
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    // Default to today
    default:
      return {
        startDate: new Date(today.getTime()),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
