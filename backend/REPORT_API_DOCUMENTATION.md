# Report API Documentation

This document describes the backend report endpoints available in the OneShop POS system.

## Authentication
All report endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer {token}
```

## Date Range Filtering

All date-based report endpoints support preset date ranges and custom date ranges:

### Preset Date Ranges
- `today` - Current day
- `last-7-days` - Last 7 days including today
- `this-month` - Current calendar month
- `last-month` - Previous calendar month
- `last-3-months` - Last 3 months
- `last-6-months` - Last 6 months
- `last-year` - Last year
- `custom` - Custom date range (requires `startDate` and/or `endDate` parameters)

### Query Parameters for Date Filtering
- `preset` (optional): Use preset date range (e.g., "today", "last-7-days", "this-month")
- `startDate` (optional): ISO date string (e.g., "2026-04-01") for custom start date
- `endDate` (optional): ISO date string (e.g., "2026-04-30") for custom end date

**Note:** If no date parameters are provided, the endpoint returns data for "today".

## Endpoints

### 1. Sales by Product Report
**Endpoint:** `GET /api/reports/sales-by-product`

**Query Parameters:**
- `preset` (optional): Preset date range ("today", "last-7-days", "this-month", etc.)
- `startDate` (optional): ISO date string for custom start date
- `endDate` (optional): ISO date string for custom end date

**Response:**
```json
{
  "dateRange": "Today",
  "summary": {
    "totalUnitsSold": 150,
    "topGrossingItem": "Wireless Headphones",
    "topGrossingAmount": 75000,
    "topCategory": "Electronics",
    "topCategoryRevenue": 125000
  },
  "products": [
    {
      "sku": "EL-001",
      "name": "Wireless Headphones",
      "qty": 50,
      "sales": 75000
    }
  ]
}
```

**Description:** Provides sales metrics aggregated by product including units sold and revenue.

**Example Requests:**
```bash
# Get today's sales
curl "http://localhost:5000/api/reports/sales-by-product?preset=today"

# Get last 7 days sales
curl "http://localhost:5000/api/reports/sales-by-product?preset=last-7-days"

# Get this month's sales
curl "http://localhost:5000/api/reports/sales-by-product?preset=this-month"

# Custom date range
curl "http://localhost:5000/api/reports/sales-by-product?startDate=2026-04-01&endDate=2026-04-30"
```

---

### 2. Daily Z Report
**Endpoint:** `GET /api/reports/daily-z-report`

**Query Parameters:**
- `preset` (optional): Preset date range ("today", "last-7-days", "this-month", etc.)
- `startDate` (optional): ISO date string for custom start date
- `endDate` (optional): ISO date string for custom end date

**Response:**
```json
{
  "dateRange": "Today",
  "summary": {
    "grossSales": 1449000,
    "totalTransactions": 179,
    "refunds": 18500,
    "voids": 5000
  },
  "paymentBreakdown": [
    {
      "method": "Cash",
      "amount": 524500,
      "txCount": 72
    },
    {
      "method": "Card",
      "amount": 612000,
      "txCount": 68
    },
    {
      "method": "Online",
      "amount": 312500,
      "txCount": 39
    }
  ]
}
```

**Description:** End-of-day POS closure summary with payment method breakdown. Used for reconciliation.

**Example Requests:**
```bash
# Get today's Z report
curl "http://localhost:5000/api/reports/daily-z-report?preset=today"

# Get last 7 days Z report
curl "http://localhost:5000/api/reports/daily-z-report?preset=last-7-days"

# Get specific day
curl "http://localhost:5000/api/reports/daily-z-report?startDate=2026-04-23"
```

---

### 3. Inventory Status Report
**Endpoint:** `GET /api/reports/inventory-status`

**Query Parameters:**
- `category` (optional): Filter by category name (e.g., "Electronics")
- `status` (optional): Filter by stock status ("In Stock", "Low Stock", "Out of Stock")
- `sortBy` (optional): Sort results by field ("value", "stock", "margin", or default by ID)

**Response:**
```json
{
  "summary": {
    "totalAssetValue": 1250000,
    "totalRetailValue": 1850000,
    "lowStockCount": 12,
    "outOfStockCount": 3,
    "totalProducts": 145,
    "totalUnits": 2840,
    "potentialMargin": 600000
  },
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sku": "AU-001",
      "name": "Wireless Headphones",
      "category": "Electronics",
      "cost": 2500,
      "retail": 4000,
      "margin": 60.00,
      "stock": 15,
      "lowStockThreshold": 5,
      "value": 37500,
      "retailValue": 60000,
      "status": "In Stock",
      "brand": "TechBrand",
      "featured": true
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "sku": "EL-102",
      "name": "USB-C Hub",
      "category": "Accessories",
      "cost": 5000,
      "retail": 8500,
      "margin": 70.00,
      "stock": 2,
      "lowStockThreshold": 5,
      "value": 10000,
      "retailValue": 17000,
      "status": "Low Stock",
      "brand": "N/A",
      "featured": false
    }
  ]
}
```

**Description:** Real-time inventory overview showing asset values, retail values, margins, and stock alerts. Values are calculated at cost price for asset value and selling price for retail value.

**Stock Status:**
- "In Stock": stock > lowStockThreshold
- "Low Stock": 0 < stock <= lowStockThreshold
- "Out of Stock": stock = 0

**Summary Fields:**
- `totalAssetValue`: Total inventory value at cost price
- `totalRetailValue`: Total inventory value at selling price
- `potentialMargin`: Potential profit (retail value - asset value)
- `totalProducts`: Total number of products in inventory
- `totalUnits`: Total units in stock across all products

**Product Fields:**
- `margin`: Profit margin percentage based on cost and selling price
- `retailValue`: Potential revenue value if all stock is sold

**Example Requests:**

```bash
# Filter by category
curl "http://localhost:5000/api/reports/inventory-status?category=Electronics"

# Get only low stock items
curl "http://localhost:5000/api/reports/inventory-status?status=Low%20Stock"

# Sort by profit margin (highest first)
curl "http://localhost:5000/api/reports/inventory-status?sortBy=margin"

# Combine filters: Electronics category, low stock, sorted by value
curl "http://localhost:5000/api/reports/inventory-status?category=Electronics&status=Low%20Stock&sortBy=value"
```

---

### 4. Customer Activity Report
**Endpoint:** `GET /api/reports/customer-activity`

**Query Parameters:**
- `preset` (optional): Preset date range ("today", "last-7-days", "this-month", etc.)
- `startDate` (optional): ISO date string for custom start date
- `endDate` (optional): ISO date string for custom end date

**Response:**
```json
{
  "dateRange": "This Month",
  "summary": {
    "uniqueCustomers": 142,
    "topSpender": "Nimal Perera",
    "topSpenderAmount": 45000,
    "newVsReturning": {
      "returning": 85,
      "new": 15
    }
  },
  "customers": [
    {
      "name": "Nimal Perera",
      "phone": "0712345678",
      "type": "Returning",
      "orderCount": 12,
      "spent": 60000,
      "loyaltyTier": "Gold",
      "lastOrder": "2026-04-23T10:30:00Z"
    }
  ]
}
```

**Description:** Customer transaction analytics including loyalty metrics and purchasing patterns.

**Loyalty Tier Calculation (based on total spent):**
- Platinum: >= 100,000
- Gold: >= 50,000
- Silver: >= 20,000
- Bronze: < 20,000

**Customer Type:**
- "New": Only 1 order in the period
- "Returning": More than 1 order in the period

**Example Requests:**
```bash
# Get today's customer activity
curl "http://localhost:5000/api/reports/customer-activity?preset=today"

# Get this month's customer activity
curl "http://localhost:5000/api/reports/customer-activity?preset=this-month"

# Get last 30 days
curl "http://localhost:5000/api/reports/customer-activity?preset=last-month"

# Custom date range
curl "http://localhost:5000/api/reports/customer-activity?startDate=2026-04-01&endDate=2026-04-30"
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid date format"
}
```

**401 Unauthorized:**
```json
{
  "error": "Missing or invalid authentication token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch [report type]"
}
```

---

## Example Requests

### Using curl with Presets:

**Sales by Product Report (Last 7 Days):**
```bash
curl -X GET "http://localhost:5000/api/reports/sales-by-product?preset=last-7-days" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Daily Z Report (This Month):**
```bash
curl -X GET "http://localhost:5000/api/reports/daily-z-report?preset=this-month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Inventory Status Report:**
```bash
curl -X GET "http://localhost:5000/api/reports/inventory-status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Customer Activity Report (Last 30 Days):**
```bash
curl -X GET "http://localhost:5000/api/reports/customer-activity?preset=last-month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Custom Date Ranges:

**Sales Report for April 2026:**
```bash
curl -X GET "http://localhost:5000/api/reports/sales-by-product?startDate=2026-04-01&endDate=2026-04-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Customer Activity for Specific Week:**
```bash
curl -X GET "http://localhost:5000/api/reports/customer-activity?startDate=2026-04-15&endDate=2026-04-21" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. All monetary values are in the system's default currency (LKR).
2. Date filters use ISO 8601 format (YYYY-MM-DD).
3. When date range is not specified, the endpoint returns all-time data.
4. For Daily Z Report, if only startDate is provided, it will return data for that single day only.
5. Product records in inventory report use cost price for asset value calculations.
6. Customer loyalty tiers are automatically calculated based on cumulative spending.
