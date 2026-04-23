# Report Backend Integration Guide

This guide explains how to use the report endpoints from the frontend, especially with the date range filtering UI.

## Quick Start

### Frontend Date Toolbar Options
The `ReportsDateToolbar` component provides these preset date range buttons:
- **Today** → `preset=today`
- **Last 7 Days** → `preset=last-7-days`
- **This Month** → `preset=this-month`
- **Custom** → Use calendar to select `startDate` and `endDate`

## Integration Examples

### Example 1: Sales by Product Report with Date Filtering

```typescript
// Frontend component (React/Next.js)
const fetchSalesReport = async (dateRange: string) => {
  const params = new URLSearchParams();
  
  if (dateRange === 'today') {
    params.append('preset', 'today');
  } else if (dateRange === 'last-7-days') {
    params.append('preset', 'last-7-days');
  } else if (dateRange === 'this-month') {
    params.append('preset', 'this-month');
  } else if (dateRange === 'custom') {
    params.append('startDate', selectedStartDate); // ISO format: 2026-04-01
    params.append('endDate', selectedEndDate);     // ISO format: 2026-04-30
  }

  const response = await fetch(
    `/api/reports/sales-by-product?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  console.log(data.dateRange); // e.g., "Today", "Last 7 Days", "Apr 01, 2026 - Apr 30, 2026"
  return data;
};
```

### Example 2: Daily Z Report for Today

```typescript
const fetchDailyZReport = async () => {
  const response = await fetch(
    '/api/reports/daily-z-report?preset=today',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  // data.summary = { grossSales, totalTransactions, refunds, voids }
  // data.paymentBreakdown = [{ method, amount, txCount }, ...]
  // data.dateRange = "Today"
  return data;
};
```

### Example 3: Customer Activity with Date Range

```typescript
const handleDateRangeChange = async (preset: string) => {
  const url = new URL('/api/reports/customer-activity', window.location.origin);
  url.searchParams.append('preset', preset);
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  console.log(`Showing data for: ${data.dateRange}`);
  return data;
};
```

### Example 4: Custom Date Range

```typescript
const handleCustomDateRange = async (startDate: Date, endDate: Date) => {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  const response = await fetch(
    `/api/reports/customer-activity?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  return data;
};
```

## Response Structure

All endpoints return responses with consistent structure:

```typescript
{
  dateRange: "Today" | "Last 7 Days" | "Last Month" | "Apr 01, 2026 - Apr 30, 2026",
  summary: { /* endpoint-specific summary data */ },
  // Additional fields based on endpoint
}
```

## Date Format Reference

### ISO Date Format (for custom ranges)
```
YYYY-MM-DD
Examples:
- 2026-04-01 (April 1, 2026)
- 2026-04-30 (April 30, 2026)
- 2026-12-25 (December 25, 2026)
```

### Available Preset Values
```
- today
- last-7-days
- this-month
- last-month
- last-3-months
- last-6-months
- last-year
- custom (with startDate/endDate)
```

## Handling Date Ranges in Components

### Hook Example
```typescript
const useReportDateRange = () => {
  const [dateRange, setDateRange] = useState('today');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);

  const getQueryParams = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `startDate=${customStart}&endDate=${customEnd}`;
    }
    return `preset=${dateRange}`;
  };

  return { dateRange, setDateRange, getQueryParams, customStart, customEnd, setCustomStart, setCustomEnd };
};
```

### Using with ReportsDateToolbar

```typescript
export function SalesByProductReport() {
  const { dateRange, setDateRange, getQueryParams } = useReportDateRange();
  const [data, setData] = useState(null);

  const handleDateRangeClick = async (range: string) => {
    setDateRange(range);
    const response = await fetch(
      `/api/reports/sales-by-product?preset=${range}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    setData(await response.json());
  };

  return (
    <div>
      <ReportsDateToolbar onRangeChange={handleDateRangeClick} />
      {data && <p>Period: {data.dateRange}</p>}
      {/* Render report data */}
    </div>
  );
}
```

## API Error Handling

All endpoints may return these error responses:

```typescript
// 400 Bad Request
{ error: "Invalid date format" }

// 401 Unauthorized  
{ error: "Missing or invalid authentication token" }

// 500 Internal Server Error
{ error: "Failed to fetch [report type]" }
```

## Performance Tips

1. **Use Presets for Common Ranges**: Presets are pre-calculated server-side
2. **Cache Results**: Store report data for the current date range
3. **Debounce Custom Date Selection**: Wait for user to finish selecting dates before fetching
4. **Pagination**: For large datasets, consider implementing pagination in future versions

## Notes

- All timestamps are in the database's local timezone
- Empty results return valid responses with zero values
- Date ranges are inclusive on both start and end dates
- Default behavior (no parameters) returns "today" data
