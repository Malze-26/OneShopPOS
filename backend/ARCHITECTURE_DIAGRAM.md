# Backend Report System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            ReportsDateToolbar Component                     │  │
│  │  ┌──────────┬──────────────┬────────────┬──────────┐       │  │
│  │  │  Today   │ Last 7 Days  │ This Month │ Custom   │       │  │
│  │  └──────────┴──────────────┴────────────┴──────────┘       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ↓ (preset=today, last-7-days, etc.)                   │
│              ↓ (or startDate=... & endDate=...)                    │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ HTTP GET Request
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Express Router (routes/reports.ts)               │  │
│  │  /sales-by-product                                          │  │
│  │  /daily-z-report                                            │  │
│  │  /inventory-status                                          │  │
│  │  /customer-activity                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ↓ (Authentication via protect middleware)              │
│              ↓ (Routes to appropriate controller)                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │      Report Controllers (controllers/reportController.ts)   │  │
│  │  • getSalesByProductReport()                                │  │
│  │  • getDailyZReport()                                        │  │
│  │  • getInventoryStatusReport()                               │  │
│  │  • getCustomerActivityReport()                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ↓ (Uses date range utilities)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │      Date Range Utility (utils/dateRange.ts)               │  │
│  │  • getDateRange()                                           │  │
│  │  • buildDateFilter()                                        │  │
│  │  • getDateRangeLabel()                                      │  │
│  │  • getDateRangeStats()                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ↓ (Generates MongoDB $match filter)                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │       MongoDB Aggregation Pipelines                         │  │
│  │  $match (date filter) → $group → $lookup → $sort            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              ↓ (Query execution)                                    │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ Database Query
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (MongoDB)                         │
│                                                                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│  │   Orders     │  Products    │  Customers   │ Transactions │     │
│  │              │              │              │              │     │
│  │ • createdAt  │ • stock      │ • name       │ • amount     │     │
│  │ • total      │ • costPrice  │ • phone      │ • payMethod  │     │
│  │ • items      │ • selling... │ • totalOrders│ • createdAt  │     │
│  │ • status     │ • category   │ • totalSpent │ • status     │     │
│  │ • payment... │ • brand      │ • lastPurch..│ • orderId    │     │
│  │              │              │              │              │     │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                            ↑ Query Results
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Response Formatting                              │  │
│  │  {                                                           │  │
│  │    "dateRange": "Today",                                    │  │
│  │    "summary": { /* calculated metrics */ },                 │  │
│  │    "data": [ /* report records */ ]                         │  │
│  │  }                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                            ↓ JSON Response
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                               │
│                  Render Report Charts & Tables                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Sales by Product Example

```
User clicks "Last 7 Days"
         ↓
API Call: GET /api/reports/sales-by-product?preset=last-7-days
         ↓
Express routes to: getSalesByProductReport()
         ↓
buildDateFilter('last-7-days') calculates:
  startDate: 2026-04-17 00:00:00
  endDate:   2026-04-23 23:59:59
         ↓
MongoDB Aggregation Pipeline:
  1. $match: { createdAt: { $gte: 2026-04-17, $lte: 2026-04-23 } }
  2. $unwind: items
  3. $group: { product sales metrics }
  4. $sort: by quantity descending
  5. $limit: 100
         ↓
Response formatted with:
  dateRange: "Last 7 Days"
  summary: { totalUnitsSold, topGrossingItem, ... }
  products: [ { sku, name, qty, sales }, ... ]
         ↓
Frontend displays report for April 17-23, 2026
```

## Request/Response Cycle

### Request
```
GET /api/reports/sales-by-product?preset=last-7-days
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Processing Steps
1. ✓ Auth middleware validates token
2. ✓ Route handler calls getSalesByProductReport()
3. ✓ Date utility converts preset to date range
4. ✓ MongoDB query executes with date filter
5. ✓ Results aggregated and formatted

### Response
```json
{
  "dateRange": "Last 7 Days",
  "summary": {
    "totalUnitsSold": 450,
    "topGrossingItem": "Wireless Headphones",
    "topGrossingAmount": 225000,
    "topCategory": "Electronics",
    "topCategoryRevenue": 375000
  },
  "products": [
    {
      "sku": "EL-001",
      "name": "Wireless Headphones",
      "qty": 50,
      "sales": 75000
    }
    // ... more products
  ]
}
```

## Preset Date Range Calculations

```
TODAY (April 23, 2026)

today
  → Start: Apr 23, 00:00:00
  → End:   Apr 23, 23:59:59

last-7-days
  → Start: Apr 17, 00:00:00
  → End:   Apr 23, 23:59:59

this-month
  → Start: Apr 1, 00:00:00
  → End:   Apr 30, 23:59:59

last-month
  → Start: Mar 1, 00:00:00
  → End:   Mar 31, 23:59:59

last-3-months
  → Start: Feb 1, 00:00:00
  → End:   Apr 30, 23:59:59

last-6-months
  → Start: Nov 1, 2025 00:00:00
  → End:   Apr 30, 2026 23:59:59

last-year
  → Start: May 1, 2025 00:00:00
  → End:   Apr 30, 2026 23:59:59
```

## Database Indexes (Recommended)

```javascript
// Improve query performance for date-based reports
db.orders.createIndex({ createdAt: -1, status: 1 });
db.orders.createIndex({ createdAt: -1, storeId: 1 });

db.transactions.createIndex({ createdAt: -1, status: 1 });

db.products.createIndex({ category: 1, stock: -1 });
db.products.createIndex({ storeId: 1, category: 1 });
```

## Error Handling Flow

```
API Request
    ↓
[Auth Check]
    ├─ ✗ Invalid token
    │   → 401 Unauthorized
    │
[Parameter Validation]
    ├─ ✗ Invalid date format
    │   → 400 Bad Request
    │
[Database Query]
    ├─ ✗ Connection error
    │   → 500 Internal Server Error
    │
[Response Formatting]
    ├─ ✓ Success
    │   → 200 OK with JSON
```

## Files Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── reportController.ts (4 report functions)
│   ├── routes/
│   │   └── reports.ts (4 endpoints)
│   ├── utils/
│   │   └── dateRange.ts (date calculations)
│   ├── models/
│   │   ├── Order.ts
│   │   ├── Product.ts
│   │   ├── Customer.ts
│   │   └── Transaction.ts
│   └── index.ts (Express app)
│
├── REPORT_API_DOCUMENTATION.md
├── REPORT_API_QUICK_REFERENCE.md
├── REPORT_INTEGRATION_GUIDE.md
└── REPORT_IMPLEMENTATION_SUMMARY.md
```

## Component Interactions

```
┌─────────────────────────────────────────────┐
│       Frontend Report Components            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  ReportsTabs                        │   │
│  │  - Sales by Product                 │   │
│  │  - Daily Z Report                   │   │
│  │  - Inventory Status                 │   │
│  │  - Customer Activity                │   │
│  └─────────────────────────────────────┘   │
│              ↓                              │
│  ┌─────────────────────────────────────┐   │
│  │  ReportsDateToolbar                 │   │
│  │  - Preset buttons                   │   │
│  │  - Custom calendar                  │   │
│  │  - Export button                    │   │
│  └─────────────────────────────────────┘   │
│              ↓                              │
│  ┌─────────────────────────────────────┐   │
│  │  API Calls with Date Parameters     │   │
│  │  ?preset=today or               │   │
│  │  ?startDate=...&endDate=...         │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
        ↓
Backend API with Date Range Filtering
```

This architecture provides:
- ✅ Flexible date range filtering
- ✅ Efficient database queries
- ✅ Consistent response format
- ✅ Easy frontend integration
- ✅ Scalable design
