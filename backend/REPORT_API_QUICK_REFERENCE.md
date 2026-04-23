# Report API Quick Reference

## Base URL
```
http://localhost:5000/api/reports
```

## Authentication
All endpoints require: `Authorization: Bearer {token}`

---

## Endpoints

### 1. Sales by Product Report
```
GET /api/reports/sales-by-product
```

**Parameters:**
| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| preset | string (optional) | today, last-7-days, this-month | Preset date range |
| startDate | string (optional) | 2026-04-01 | Custom start date (ISO) |
| endDate | string (optional) | 2026-04-30 | Custom end date (ISO) |

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
      "name": "Product Name",
      "qty": 50,
      "sales": 75000
    }
  ]
}
```

---

### 2. Daily Z Report
```
GET /api/reports/daily-z-report
```

**Parameters:**
| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| preset | string (optional) | today, last-7-days | Preset date range |
| startDate | string (optional) | 2026-04-23 | Custom start date (ISO) |
| endDate | string (optional) | 2026-04-23 | Custom end date (ISO) |

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
    }
  ]
}
```

---

### 3. Inventory Status Report
```
GET /api/reports/inventory-status
```

**Parameters:**
| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| category | string (optional) | Electronics | Filter by category |
| status | string (optional) | Low Stock | Filter by status |
| sortBy | string (optional) | value, stock, margin | Sort field |

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
    }
  ]
}
```

---

### 4. Customer Activity Report
```
GET /api/reports/customer-activity
```

**Parameters:**
| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| preset | string (optional) | this-month | Preset date range |
| startDate | string (optional) | 2026-04-01 | Custom start date (ISO) |
| endDate | string (optional) | 2026-04-30 | Custom end date (ISO) |

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

---

## Preset Date Ranges

| Preset | Description | Date Range |
|--------|-------------|-----------|
| today | Current day | 2026-04-23 00:00:00 - 23:59:59 |
| last-7-days | Last 7 days | 2026-04-17 - 2026-04-23 |
| this-month | Current month | 2026-04-01 - 2026-04-30 |
| last-month | Previous month | 2026-03-01 - 2026-03-31 |
| last-3-months | Last 3 months | 2026-02-01 - 2026-04-30 |
| last-6-months | Last 6 months | 2025-11-01 - 2026-04-30 |
| last-year | Last year | 2025-05-01 - 2026-04-30 |

---

## Common cURL Examples

### Get today's sales report
```bash
curl -X GET "http://localhost:5000/api/reports/sales-by-product?preset=today" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get last 7 days sales report
```bash
curl -X GET "http://localhost:5000/api/reports/sales-by-product?preset=last-7-days" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get custom date range sales report
```bash
curl -X GET "http://localhost:5000/api/reports/sales-by-product?startDate=2026-04-01&endDate=2026-04-30" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get today's Z report
```bash
curl -X GET "http://localhost:5000/api/reports/daily-z-report?preset=today" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get inventory with low stock filter
```bash
curl -X GET "http://localhost:5000/api/reports/inventory-status?status=Low%20Stock&sortBy=value" \
  -H "Authorization: Bearer eyJhbGc..."
```

### Get this month's customer activity
```bash
curl -X GET "http://localhost:5000/api/reports/customer-activity?preset=this-month" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## HTTP Status Codes

| Status | Meaning | Response |
|--------|---------|----------|
| 200 | Success | Report data with dateRange field |
| 400 | Bad Request | `{ error: "Invalid date format" }` |
| 401 | Unauthorized | `{ error: "Missing or invalid token" }` |
| 500 | Server Error | `{ error: "Failed to fetch [report]" }` |

---

## Notes

- All dates use ISO 8601 format: `YYYY-MM-DD`
- Default preset when no parameters: `today`
- All monetary values in LKR (Sri Lankan Rupees)
- Empty results return valid JSON with zero/empty values
- Maximum products returned: 100 (sales report), 50 (customer list)
