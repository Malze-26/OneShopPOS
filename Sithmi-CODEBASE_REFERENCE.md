# OneShop POS — Complete Codebase Reference

> **Project:** OneShop POS — Multi-tenant Point of Sale & Inventory Management System  
> **Stack:** Next.js 14 (App Router) · Express.js · MongoDB (Mongoose) · TypeScript  
> **Last updated:** 2026-04-23

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Backend](#2-backend)
   - 2.1 [Entry Point](#21-entry-point)
   - 2.2 [Constants](#22-constants)
   - 2.3 [Types](#23-types)
   - 2.4 [Middleware](#24-middleware)
   - 2.5 [Models (Database Schemas)](#25-models-database-schemas)
   - 2.6 [Controllers (Business Logic)](#26-controllers-business-logic)
   - 2.7 [Routes (API Endpoints)](#27-routes-api-endpoints)
   - 2.8 [Utility Scripts](#28-utility-scripts)
3. [Frontend](#3-frontend)
   - 3.1 [Root Layout & Entry](#31-root-layout--entry)
   - 3.2 [Contexts (Global State)](#32-contexts-global-state)
   - 3.3 [Library (lib/)](#33-library-lib)
   - 3.4 [Hooks](#34-hooks)
   - 3.5 [Shared Components](#35-shared-components)
   - 3.6 [Dashboard Components](#36-dashboard-components)
   - 3.7 [Layout Components](#37-layout-components)
   - 3.8 [Manager Pages](#38-manager-pages)
   - 3.9 [POS System (pos/)](#39-pos-system-pos)
4. [How the Layers Connect](#4-how-the-layers-connect)
5. [Authentication & Role Flow](#5-authentication--role-flow)
6. [Multi-Tenancy Pattern](#6-multi-tenancy-pattern)

---

## 1. Project Overview

OneShop POS is split into two applications that share one MongoDB Atlas database:

| App | Folder | Who uses it |
|-----|--------|-------------|
| **Manager Dashboard** | `frontend/app/` (non-pos routes) | Store Managers |
| **POS Terminal** | `frontend/app/pos/` | Cashiers & Sales Representatives |
| **API Server** | `backend/src/` | Both frontends |

All data is scoped to a `storeId` string. Every model stores `storeId` and every query filters by it, enabling multiple stores to share one database safely.

---

## 2. Backend

### 2.1 Entry Point

#### `backend/src/index.ts`
The Express application bootstrap file. Responsibilities:
- Overrides Node's DNS resolver to use Google's `8.8.8.8` (fixes Atlas connectivity on some networks).
- Loads environment variables from `.env` via `dotenv/config`.
- Configures CORS to allow `localhost:3000`, `localhost:3001`, and the optional `FRONTEND_URL` env var.
- Registers `express.json()` and `express.urlencoded()` body parsers.
- Serves the `uploads/` folder as static files at `/uploads` (product images, logos, avatars).
- Mounts all 11 API route modules under `/api/`.
- Registers a catch-all 404 handler and a global error handler.
- Connects to MongoDB Atlas using `MONGODB_URI`, then starts listening on `PORT` (default `5000`).

---

### 2.2 Constants

#### `backend/src/constants/index.ts`
Single source of truth for every magic string and magic number used across controllers. Importing from here instead of hardcoding ensures changes only need to be made in one place.

| Constant | Value | Used for |
|----------|-------|---------|
| `DEFAULT_CATEGORY_ICON` | `'📦'` | New categories with no icon chosen |
| `DEFAULT_CATEGORY_COLOR` | `'#155dfc'` | New categories with no colour chosen |
| `DEFAULT_CATEGORY_NAME` | `'Uncategorized'` | CSV import rows with no category |
| `DEFAULT_LOW_STOCK_THRESHOLD` | `10` | New products with no threshold set |
| `DEFAULT_COST_PRICE` | `0` | Products created without a cost price |
| `DEFAULT_STOCK` | `0` | Products created with no opening stock |
| `DEFAULT_PAGE` | `1` | Pagination default page number |
| `DEFAULT_PAGE_LIMIT` | `10` | Pagination default items per page |
| `MAX_PAGE_LIMIT` | `50` | Maximum items per page (prevents abuse) |
| `GRN_NUMBER_PAD_LENGTH` | `4` | Zero-padding for GRN numbers (e.g. `0001`) |
| `STOCK_HISTORY_RECENT_LIMIT` | `20` | Max history rows returned in product detail |
| `SYSTEM_ACTOR` | `'System'` | Fallback actor label when no user on request |

---

### 2.3 Types

#### `backend/src/types/index.ts`
Shared TypeScript types used across all middleware and controllers.

- **`UserRole`** — Union type `'Manager' | 'Cashier' | 'Sales Representative'`. Used wherever a role comparison is needed so all three roles are covered.
- **`TokenPayload`** — Extends `jsonwebtoken.JwtPayload`. Shape of the decoded JWT: `{ id, email, role: UserRole, storeId }`. This is what `req.user` contains on every protected request.
- **`AuthRequest`** — Extends Express `Request` with an optional `user?: TokenPayload`. Used as the request type in all protected controllers instead of plain `Request`.

---

### 2.4 Middleware

#### `backend/src/middleware/authMiddleware.ts`
Two Express middleware functions that protect routes.

- **`protect(req, res, next)`** — Reads the `Authorization: Bearer <token>` header, verifies the JWT using `JWT_SECRET`, and attaches the decoded payload to `req.user`. Returns `401` if the header is missing, malformed, or the token has expired.
- **`requireRole(...roles: UserRole[])`** — Factory that returns a middleware. Checks `req.user.role` is in the provided list. Returns `403` if not. Used after `protect`. Example: `requireRole('Manager')` on write endpoints; `requireRole('Cashier', 'Sales Representative')` on POS endpoints.

#### `backend/src/middleware/upload.ts`
Multer configuration for **product image** uploads.
- Saves files to `uploads/products/`.
- Generates filenames as `<timestamp>-<originalname>`.
- Accepts `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- Limits: max 5 MB per file, max 5 files per request.
- Exported as `uploadProductImages` (Multer instance).

#### `backend/src/middleware/uploadLogo.ts`
Multer configuration for the **store logo** upload.
- Saves files to `uploads/logo/`.
- Always names the file `store-logo.<ext>` (overwrites previous logo automatically).
- Accepts `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- Limit: max 2 MB, 1 file.
- Exported as `uploadLogoMiddleware`.

#### `backend/src/middleware/uploadAvatar.ts`
Multer configuration for **user profile picture** uploads.
- Saves files to `uploads/avatars/`.
- Names files `avatar-<userId>.<ext>` (one avatar file per user, overwrites on re-upload).
- Accepts `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- Limit: max 2 MB, 1 file.
- Exported as `uploadAvatarMiddleware`.

---

### 2.5 Models (Database Schemas)

All models include Mongoose `timestamps: true`, which adds `createdAt` and `updatedAt` to every document automatically.

#### `backend/src/models/User.ts`
Represents a system user (Manager, Cashier, or Sales Representative).

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, min 6 chars, `select: false` (excluded from all queries by default) |
| `phone` | String | Optional |
| `avatar` | String | Optional, stores URL path like `/uploads/avatars/avatar-<id>.jpg` |
| `role` | Enum | `'Manager' \| 'Cashier' \| 'Sales Representative'`, default `'Cashier'` |
| `storeId` | String | Required, default `'STORE-2025-001'` |
| `isActive` | Boolean | Default `true`; set to `false` to deactivate login |
| `lastLogin` | Date | Updated on every successful login |

**Pre-save hook:** Automatically bcrypt-hashes `password` when it changes (never stores plaintext).  
**Instance method:** `comparePassword(candidate)` — returns a boolean, used during login.

#### `backend/src/models/Product.ts`
Core inventory item.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required |
| `sku` | String | Required, unique per store (compound index) |
| `description` | String | Optional |
| `sellingPrice` | Number | Required, min 0 |
| `costPrice` | Number | Default 0 |
| `stock` | Number | Current quantity, default 0 |
| `lowStockThreshold` | Number | Alert threshold, default 10 |
| `category` | String | Category name (denormalised) |
| `images` | String[] | Array of URL paths |
| `storeId` | String | Required |
| `createdBy` | ObjectId | Ref to User |

**Virtual field `status`** (not stored in DB, computed on read):
- `'out_of_stock'` — stock = 0
- `'low_stock'` — stock > 0 and stock ≤ lowStockThreshold
- `'in_stock'` — stock > lowStockThreshold

Virtuals are included in JSON output (`toJSON: { virtuals: true }`).

#### `backend/src/models/Category.ts`
Groups products into named categories.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required, trimmed |
| `icon` | String | Emoji or icon identifier |
| `color` | String | Hex colour for UI display |
| `productCount` | Number | Stored count (kept for reference; live count is computed in `getCategories`) |
| `storeId` | String | Required |

**Unique index** on `{ name, storeId }` — prevents two categories with the same name in the same store. Violation returns MongoDB error code `11000`, caught in `createCategory` and returned as a `409`.

#### `backend/src/models/Customer.ts`
Stores customer profiles linked to a store.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required |
| `email` | String | Optional, unique when provided |
| `phone` | String | Optional |
| `avatar` | String | URL path to profile image |
| `totalOrders` | Number | Cumulative order count |
| `totalSpent` | Number | Cumulative spend in store currency |
| `lastPurchase` | Date | Date of most recent purchase |
| `storeId` | String | Required |

#### `backend/src/models/Transaction.ts`
Records every completed payment at the POS terminal.

| Field | Type | Notes |
|-------|------|-------|
| `txnId` | String | Unique transaction ID (e.g. `TXN-XXXXXX`) |
| `orderId` | String | Links back to the Order |
| `customer` | String | Customer name or `'Walk-in Customer'` |
| `paymentMethod` | Enum | `'Cash' \| 'Card' \| 'Bank Transfer'` |
| `amount` | Number | Total amount paid |
| `status` | Enum | `'success' \| 'pending' \| 'failed' \| 'refunded' \| 'voided'` |
| `storeId` | String | Required |
| `createdBy` | ObjectId | Ref to User (the cashier) |

#### `backend/src/models/Order.ts`
Represents a sales order created at the POS.

| Field | Type | Notes |
|-------|------|-------|
| `orderId` | String | Unique order reference |
| `items` | Array | `{ product, name, sku, qty, price, subtotal }` |
| `subtotal` | Number | Pre-tax, pre-discount total |
| `tax` | Number | Tax amount |
| `discount` | Number | Discount amount |
| `total` | Number | Final amount charged |
| `paymentMethod` | Enum | `'Cash' \| 'Card'` |
| `status` | Enum | `'completed' \| 'pending' \| 'refunded' \| 'void'` |
| `customer` | String | Customer name |
| `cashierId` | ObjectId | Ref to User |
| `storeId` | String | Required |

#### `backend/src/models/GRN.ts`
Goods Received Note — records stock delivered from a supplier.

| Field | Type | Notes |
|-------|------|-------|
| `grnNumber` | String | Auto-generated, e.g. `GRN-2025-0001` |
| `supplier` | String | Supplier name |
| `referenceNumber` | String | Supplier's invoice/delivery reference |
| `notes` | String | Free-text notes |
| `items` | Array | `{ product, productName, sku, quantityReceived, costPrice, subtotal }` |
| `totalItems` | Number | Sum of all `quantityReceived` |
| `totalCost` | Number | Sum of all `subtotal` |
| `receivedBy` | String | Email of the manager who created it |
| `storeId` | String | Required |

#### `backend/src/models/StockHistory.ts`
Audit trail of every stock movement (add or remove).

| Field | Type | Notes |
|-------|------|-------|
| `product` | ObjectId | Ref to Product |
| `type` | Enum | `'add' \| 'remove'` |
| `quantity` | Number | Units moved |
| `reason` | String | Human-readable reason (e.g. `'GRN: GRN-2025-0001'`, `'Initial Stock'`, `'Damaged goods'`) |
| `by` | String | Email of the actor |
| `storeId` | String | Required |

Every product creation, stock adjustment, and GRN receipt creates a record here. Used to build the movement history shown on the Stocks page and Product detail page.

#### `backend/src/models/Supplier.ts`
Supplier/vendor contact records.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Required |
| `email` | String | Optional |
| `phone` | String | Optional |
| `address` | String | Optional |
| `contactPerson` | String | Primary contact name |
| `storeId` | String | Required |

#### `backend/src/models/Promo.ts`
Promotional discount rules applied at checkout.

| Field | Type | Notes |
|-------|------|-------|
| `code` | String | Unique promo code per store |
| `type` | Enum | `'percentage' \| 'fixed'` |
| `value` | Number | Discount amount (percentage 0–100 or fixed amount) |
| `minOrder` | Number | Minimum order total to qualify |
| `maxUses` | Number | Usage cap (0 = unlimited) |
| `usedCount` | Number | Times this promo has been applied |
| `expiresAt` | Date | Optional expiry |
| `isActive` | Boolean | Default `true` |
| `storeId` | String | Required |

#### `backend/src/models/StoreSettings.ts`
One document per store. Holds all store-wide configuration.

| Field | Type | Notes |
|-------|------|-------|
| `storeId` | String | Unique, links to all other collections |
| `storeName` | String | Display name |
| `address` | String | Physical address |
| `phone` | String | Contact phone |
| `email` | String | Contact email |
| `currency` | String | ISO code, e.g. `'LKR'` |
| `currencyLocale` | String | Locale for formatting, e.g. `'en-LK'` |
| `logoUrl` | String | URL path to uploaded logo |
| `primaryColor` | String | Hex colour applied across the UI |

---

### 2.6 Controllers (Business Logic)

Controllers contain all business logic. Routes delegate to controllers; controllers never import routes.

#### `backend/src/controllers/authController.ts`
Handles all user authentication and profile management.

| Function | Method | Description |
|----------|--------|-------------|
| `login` | `POST /auth/login` | Validates email + password, updates `lastLogin`, returns JWT and user object |
| `register` | `POST /auth/register` | Creates a new user (Manager-only); used by Manager to create Cashier/Sales Rep accounts |
| `changePassword` | `POST /auth/change-password` | Verifies current password, hashes and saves new password |
| `getMe` | `GET /auth/me` | Returns fresh user data from DB (used to restore session on page reload) |
| `updateProfile` | `PATCH /auth/profile` | Updates `name` and `phone` only — email is immutable by design |
| `uploadAvatar` | `POST /auth/profile/avatar` | Saves avatar file path to the user document after multer handles the upload |

**JWT payload** signed: `{ id, email, role, storeId }` — valid for `JWT_EXPIRES_IN` (default `7d`).

#### `backend/src/controllers/productController.ts`
Full lifecycle management for inventory products.

| Function | Method | Description |
|----------|--------|-------------|
| `getProducts` | `GET /products` | List all products with optional `search`, `category`, `status` filters. Status filter runs in-memory (virtual field). |
| `getProduct` | `GET /products/:id` | Single product + last 20 stock history records |
| `createProduct` | `POST /products` | Creates product with explicit field picking (no raw body spread). Increments category count. Records initial stock history if opening stock > 0. |
| `updateProduct` | `PUT /products/:id` | Updates only whitelisted fields. Runs Mongoose validators. |
| `deleteProduct` | `DELETE /products/:id` | Deletes product, decrements category count, deletes all related stock history |
| `adjustStock` | `POST /products/:id/adjust-stock` | Validates type/quantity, prevents negative stock, saves new stock level, writes StockHistory record |
| `importCSV` | `POST /products/bulk/import-csv` | Bulk create from parsed CSV rows. Per-row validation. Returns `{ imported, failed, errors[] }`. |
| `uploadProductImages` | `POST /products/:id/images` | Appends uploaded image paths to product. Cleans up disk files if product not found. |
| `deleteProductImage` | `DELETE /products/:id/images/:filename` | Removes image path from product array and deletes file from disk. |

#### `backend/src/controllers/categoryController.ts`
Manages the product category taxonomy.

| Function | Method | Description |
|----------|--------|-------------|
| `getCategories` | `GET /categories` | Returns all categories sorted alphabetically. Uses `Promise.all` to fetch categories and live product counts from aggregation in parallel. |
| `getCategory` | `GET /categories/:id` | Single category by ID |
| `createCategory` | `POST /categories` | Creates category with name, icon, color. Catches MongoDB `11000` duplicate error and returns `409`. |
| `updateCategory` | `PUT /categories/:id` | Updates name, icon, color |
| `deleteCategory` | `DELETE /categories/:id` | Deletes category. Note: products referencing this category are NOT automatically reassigned. |

#### `backend/src/controllers/employeeController.ts`
Manages staff accounts and their performance stats.

| Function | Method | Description |
|----------|--------|-------------|
| `getEmployees` | `GET /employees` | Lists all employees. Uses `Promise.all` to fetch users and aggregate transaction stats simultaneously. Merges in-memory to avoid N+1 queries. Supports `search`, `role`, `status` filters. |
| `deactivateEmployee` | `PUT /employees/:id/deactivate` | Sets `isActive: false`. Deactivated users cannot log in. |
| `activateEmployee` | `PUT /employees/:id/activate` | Sets `isActive: true`. Re-enables login for a previously deactivated account. |

**Helper functions** (private, not exported):
- `getInitials(name)` — Derives a two-letter avatar string from a full name.
- `formatLastActive(date)` — Formats a Date to `en-LK` short date+time string, returns `'Never'` if null.

#### `backend/src/controllers/stockController.ts`
Manages Goods Received Notes and stock movement history.

| Function | Method | Description |
|----------|--------|-------------|
| `getGRNs` | `GET /stocks/grns` | Paginated GRN list with `search`, `from`, `to` date filters |
| `createGRN` | `POST /stocks/grns` | Validates all items first (fail-fast), then creates GRN, increments stock for each item, writes StockHistory records |
| `getGRN` | `GET /stocks/grns/:id` | Single GRN detail |
| `getStockHistory` | `GET /stocks/history` | Paginated stock movements with `type`, `productId`, date filters. Populates `product.name` and `product.sku`. |

**Helper functions** (private, not exported):
- `generateGRNNumber(storeId)` — Reads the highest existing GRN number for the current year and returns the next sequential number, e.g. `GRN-2025-0042`.
- `parsePagination(page, limit)` — Safely parses and clamps pagination params.
- `buildDateFilter(from, to)` — Builds a MongoDB `{ $gte, $lte }` date range object.

#### `backend/src/controllers/customerController.ts`
Manages customer records.

| Function | Method | Description |
|----------|--------|-------------|
| `getCustomers` | `GET /customers` | Paginated customer list with optional `search` filter |
| `getCustomerStats` | `GET /customers/stats` | Aggregated stats: total customers, total revenue, average spend, new this month |
| `createCustomer` | `POST /customers` | Creates a new customer record |
| `updateCustomer` | `PUT /customers/:id` | Updates customer fields |
| `deleteCustomer` | `DELETE /customers/:id` | Removes a customer record |

#### `backend/src/controllers/orderController.ts`
Handles POS order creation and management.

| Function | Method | Description |
|----------|--------|-------------|
| `createOrder` | `POST /orders` | Creates an order, decrements stock for each item, creates a Transaction record, updates customer stats |
| `getOrders` | `GET /orders` | Paginated order list with status filter |
| `getOrder` | `GET /orders/:id` | Single order detail |
| `updateOrderStatus` | `PUT /orders/:id/status` | Updates order status (e.g. `completed` → `refunded`) |

#### `backend/src/controllers/transactionController.ts`
Read-only access to payment transaction records.

| Function | Method | Description |
|----------|--------|-------------|
| `getTransactions` | `GET /transactions` | Paginated transaction list with `search`, `status`, date filters |
| `getTransactionStats` | `GET /transactions/stats` | Aggregates totals and counts grouped by payment method — used by the dashboard payment chart |

#### `backend/src/controllers/promoController.ts`
Manages discount promotion codes.

| Function | Method | Description |
|----------|--------|-------------|
| `getPromos` | `GET /promos` | Lists all promos for the store |
| `createPromo` | `POST /promos` | Creates a new promo code |
| `updatePromo` | `PUT /promos/:id` | Updates promo details |
| `deletePromo` | `DELETE /promos/:id` | Deletes a promo |
| `validatePromo` | `POST /promos/validate` | Checks a promo code is valid, active, not expired, not over max uses, and order meets minimum value |

#### `backend/src/controllers/settingsController.ts`
Manages store-wide configuration.

| Function | Method | Description |
|----------|--------|-------------|
| `getSettings` | `GET /settings` | Returns the store's settings document. **Public** — no auth required (used to load theme/logo on login page). Upserts a default document if none exists. |
| `updateSettings` | `PATCH /settings` | Updates store name, address, phone, email, currency, locale, and/or primary colour. Manager only. |
| `uploadLogo` | `POST /settings/logo` | Saves the uploaded logo path to the settings document. Manager only. |

#### `backend/src/controllers/supplierController.ts`
Manages supplier/vendor contacts.

| Function | Method | Description |
|----------|--------|-------------|
| `getSuppliers` | `GET /suppliers` | Lists all suppliers with optional `search` filter |
| `createSupplier` | `POST /suppliers` | Creates a supplier record |
| `updateSupplier` | `PUT /suppliers/:id` | Updates supplier details |
| `deleteSupplier` | `DELETE /suppliers/:id` | Removes a supplier |

---

### 2.7 Routes (API Endpoints)

Every route file follows the same pattern:
1. Import `protect` and `requireRole` from `authMiddleware`.
2. Define an `asyncHandler` wrapper to forward promise rejections to Express's error handler.
3. Map HTTP methods + paths to controller functions, applying middleware as needed.

#### `backend/src/routes/auth.ts` — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | Public | Log in |
| POST | `/register` | Manager | Create employee account |
| POST | `/change-password` | Any | Change own password |
| GET | `/me` | Any | Get own profile |
| PATCH | `/profile` | Any | Update name & phone |
| POST | `/profile/avatar` | Any | Upload profile picture |

#### `backend/src/routes/products.ts` — `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List products |
| POST | `/` | Manager | Create product |
| POST | `/bulk/import-csv` | Manager | Bulk CSV import |
| GET | `/:id` | Any | Product detail |
| PUT | `/:id` | Manager | Update product |
| DELETE | `/:id` | Manager | Delete product |
| POST | `/:id/adjust-stock` | Manager | Stock adjustment |
| POST | `/:id/images` | Manager | Upload images |
| DELETE | `/:id/images/:filename` | Manager | Delete image |

#### `backend/src/routes/categories.ts` — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List categories |
| POST | `/` | Manager | Create category |
| PUT | `/:id` | Manager | Update category |
| DELETE | `/:id` | Manager | Delete category |

#### `backend/src/routes/employees.ts` — `/api/employees`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List employees |
| POST | `/` | Manager | Add employee |
| PUT | `/:id/deactivate` | Manager | Deactivate account |
| PUT | `/:id/activate` | Manager | Re-activate account |

#### `backend/src/routes/stocks.ts` — `/api/stocks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/grns` | Any | List GRNs |
| POST | `/grns` | Manager | Create GRN |
| GET | `/grns/:id` | Any | GRN detail |
| GET | `/history` | Any | Stock movement history |

#### `backend/src/routes/customers.ts` — `/api/customers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List customers |
| GET | `/stats` | Any | Aggregate stats |
| POST | `/` | Any | Create customer |
| PUT | `/:id` | Any | Update customer |
| DELETE | `/:id` | Any | Delete customer |

#### `backend/src/routes/orders.ts` — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List orders |
| POST | `/` | Any (POS) | Create order |
| GET | `/:id` | Any | Order detail |
| PUT | `/:id/status` | Manager | Update status |

#### `backend/src/routes/transactions.ts` — `/api/transactions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List transactions |
| GET | `/stats` | Any | Payment method stats |

#### `backend/src/routes/promos.ts` — `/api/promos`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List promos |
| POST | `/` | Manager | Create promo |
| POST | `/validate` | Any | Validate promo code |
| PUT | `/:id` | Manager | Update promo |
| DELETE | `/:id` | Manager | Delete promo |

#### `backend/src/routes/settings.ts` — `/api/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Get store settings |
| PATCH | `/` | Manager | Update settings |
| POST | `/logo` | Manager | Upload logo |

#### `backend/src/routes/suppliers.ts` — `/api/suppliers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any | List suppliers |
| POST | `/` | Manager | Create supplier |
| PUT | `/:id` | Manager | Update supplier |
| DELETE | `/:id` | Manager | Delete supplier |

---

### 2.8 Utility Scripts

#### `backend/src/seed.ts`
One-time database seeding script (`npm run seed`). Creates:
- One Manager user (`mng01@opendoor.lk`)
- Several Cashier and Sales Representative users
- Product categories
- Sample products (downloads images from Unsplash on first run, stores in `uploads/products/`)
- Sample customers and orders
- Store settings document

Safe to run multiple times — checks for existing records before inserting.

#### `backend/src/import-products.ts`
Script to bulk-import products from a local CSV file directly into the database. Used for large initial data loads without going through the API. Reads the CSV, validates rows, and calls `Product.create()` directly.

---

## 3. Frontend

### 3.1 Root Layout & Entry

#### `frontend/app/layout.tsx`
The root Next.js layout. Wraps the entire application in two global providers:
- **`StoreProvider`** — loads store settings (name, logo, colour) into React context.
- **`AuthProvider`** — manages JWT session state.

Sets the browser tab `<title>` from `NEXT_PUBLIC_STORE_NAME` env var, with fallback `'OneShop POS'`.

#### `frontend/app/page.tsx`
Root entry page (`/`). Immediately redirects to `/login` using Next.js `redirect()`. No UI rendered.

---

### 3.2 Contexts (Global State)

#### `frontend/app/contexts/AuthContext.tsx`
Manages the logged-in user session across the entire app.

**State managed:** `user`, `token`, `loading`

**What it does:**
- On mount, restores session from `localStorage` (rememberMe on) or `sessionStorage` (rememberMe off).
- Immediately re-fetches `/auth/me` on restore to get fresh name/avatar/phone — prevents stale profile data.
- If the stored token is invalid/expired, clears storage and resets state.

**Exposed via `useAuth()`:**

| Value / Function | Description |
|------------------|-------------|
| `user` | `{ id, name, email, role, storeId, phone?, avatar? }` or `null` |
| `token` | JWT string or `null` |
| `loading` | `true` while restoring session on first render |
| `isAuthenticated` | `true` when both `token` and `user` are set |
| `login(email, password, rememberMe?, expectedRole?)` | Calls `/auth/login`, validates role match, stores token, redirects to dashboard or POS |
| `logout()` | Clears all storage, redirects to `/login` |
| `refreshUser()` | Re-fetches `/auth/me` and updates state + storage — called after profile edits |

#### `frontend/app/contexts/StoreContext.tsx`
Provides store-wide settings to all components without prop drilling.

**What it does:**
- Fetches `/api/settings` (public endpoint) on mount.
- Applies `primaryColor` to a CSS custom property `--color-primary` on the `<html>` element — this makes the entire UI's theme colour dynamic.

**Exposed via `useStore()`:**

| Value | Description |
|-------|-------------|
| `storeName` | Store display name |
| `logoUrl` | URL path to store logo |
| `address`, `phone`, `email` | Store contact details |
| `currency` | ISO currency code (e.g. `'LKR'`) |
| `currencyLocale` | Locale string for `Intl` formatting |
| `primaryColor` | Hex colour string |
| `refresh()` | Re-fetches settings — called after saving changes in Settings page |

---

### 3.3 Library (`lib/`)

#### `frontend/app/lib/api.ts`
The single Axios instance used for **every** API call in the app.

- Base URL: `NEXT_PUBLIC_API_URL` env var, default `http://localhost:5000/api`.
- **Request interceptor:** Reads JWT from `localStorage` or `sessionStorage` and attaches `Authorization: Bearer <token>` header automatically.
- **Response interceptor:** On `401` (for any request that is not `/auth/login`), clears all storage and redirects to `/login`. This handles token expiry globally without each component needing to handle it.

Exported as both named `api` and default.

#### `frontend/app/lib/types.ts`
Shared TypeScript interfaces used across both the manager dashboard and POS system.

Key types defined:
- **`ICustomer`** — Full customer object shape matching the backend `Customer` model.
- **`IProduct`** — Product shape including the `status` virtual.
- **`IOrder`** / **`IOrderItem`** — Order and line item shapes.
- **`ITransaction`** — Transaction record shape.

These interfaces are the single source of truth for data shapes on the frontend. Components import from here rather than redeclaring types locally.

#### `frontend/app/lib/offlineDB.ts`
IndexedDB wrapper for **offline support**. Enables the POS terminal to continue processing sales when the internet connection drops.

- Opens/creates an IndexedDB database called `oneshop-offline`.
- Manages two object stores: `pendingOrders` (orders created offline) and `cachedProducts` (product catalogue snapshot).
- **`savePendingOrder(order)`** — Writes an order to `pendingOrders` for later sync.
- **`getPendingOrders()`** — Reads all unsynced orders.
- **`deletePendingOrder(id)`** — Removes an order after it has been successfully synced.
- **`cacheProducts(products)`** — Saves the current product list for offline browsing.
- **`getCachedProducts()`** — Retrieves the cached product list when the API is unreachable.

#### `frontend/app/lib/syncManager.ts`
Handles syncing offline-created data back to the server when connectivity is restored.

- **`syncPendingOrders()`** — Reads all pending orders from IndexedDB, attempts to `POST /api/orders` for each one, and deletes successful syncs from IndexedDB. Failed syncs remain for the next attempt.
- Called automatically by `useOnlineStatus` when the browser comes back online.

---

### 3.4 Hooks

#### `frontend/app/hooks/useOnlineStatus.ts`
Custom React hook that tracks the browser's network connectivity.

- Returns `{ isOnline: boolean }`.
- Adds `window` event listeners for `'online'` and `'offline'` events.
- When transitioning from offline → online, calls `syncManager.syncPendingOrders()` to flush any pending orders.
- Used in the POS dashboard to show an offline warning banner and switch to offline mode.

---

### 3.5 Shared Components

#### `frontend/app/components/layout/Sidebar.tsx`
The main navigation sidebar shown on every manager dashboard page.

- Reads `user` from `AuthContext` and store info from `StoreContext`.
- Displays the store logo (or a package icon fallback) and store name at the top.
- Renders all navigation links (`navItems` array). Active link is highlighted with a primary colour left border.
- Shows a `Logout` button at the bottom that calls `auth.logout()`.
- Navigation sections: Dashboard, Sales (Orders), Inventory (Products, Categories, Stocks, Suppliers), People (Customers, Employees), Insights (Reports, Alerts), System (Settings).

#### `frontend/app/components/layout/TopHeader.tsx`
The horizontal header bar at the top of every manager dashboard page.

- Shows the current page title (mapped from pathname).
- Contains a global search bar (UI only — not wired to an API yet).
- Notification bell with an unread badge.
- User dropdown (top-right): shows the user's avatar photo (falls back to initials), name, and role. Dropdown links to `Settings > Account` and has a `Logout` option.

#### `frontend/app/components/ManagerGuard.tsx`
Route protection component. Wraps pages that require the `Manager` role.

- Reads `user` and `loading` from `AuthContext`.
- While loading: renders nothing (prevents flash).
- If not authenticated: redirects to `/login`.
- If authenticated but not a `Manager`: redirects to `/login`.
- If authenticated as Manager: renders `children`.
- Used in `dashboard/layout.tsx` to protect all manager routes.

#### `frontend/app/components/ProductForm.tsx`
Reusable form for creating and editing products. Used by both `products/add/page.tsx` and `products/[id]/edit/page.tsx`.

Manages fields: name, SKU, description, selling price, cost price, stock, low stock threshold, category (dropdown from API), images.  
Handles image upload preview, image deletion, and form submission via callback prop.

#### `frontend/app/components/ProductTable.tsx`
Renders the product list as a data table with columns: image, name, SKU, category, stock (with status badge), selling price, and action buttons (view, edit, delete).

Receives `products` array and callbacks `onEdit`, `onDelete`, `onAdjustStock` as props.

#### `frontend/app/components/ProductListHeader.tsx`
Page header for the Products list page. Displays title, total product count, and action buttons (`Add Product`, `Import CSV`).

#### `frontend/app/components/SearchFilter.tsx`
Reusable search + filter bar. Renders a text search input and a category dropdown. Calls `onSearch` and `onFilter` callbacks on change.

#### `frontend/app/components/SummaryCards.tsx`
Displays four KPI cards on the Products page: Total Products, In Stock, Low Stock, Out of Stock. Receives counts as props.

#### `frontend/app/components/StockAdjustmentDrawer.tsx`
Slide-in drawer panel for quick stock adjustments directly from the product list. Contains type selector (add/remove), quantity input, and reason text field. Submits to `POST /products/:id/adjust-stock`.

#### `frontend/app/components/RecentStockUpdates.tsx`
Small widget showing the last few stock movements for a product. Displayed in the product detail sidebar.

#### `frontend/app/components/QuickActions.tsx`
Three quick-action buttons: View Products, Add Product, Import Products. Used on the inventory overview/summary page (older design, Figma reference era).

#### `frontend/app/components/AddProductHeader.tsx`
Breadcrumb header for the Add Product page. Shows `Products > Add Product` navigation trail.

#### `frontend/app/components/CheckoutModal.tsx`
Reusable payment completion modal. Used in the POS system.

Shows order summary (items, subtotal, tax, total), payment method selector (Cash/Card), amount received input with quick-amount buttons, change-to-return display, and customer info. Calls `onComplete` with `{ paymentMethod, amountReceived, changeToReturn }`.

#### `frontend/app/components/figma/ImageWithFallback.tsx`
`<img>` wrapper that catches image load errors and renders a placeholder box with the product name initial. Used in product tables and cards to handle missing/broken image URLs gracefully.

---

### 3.6 Dashboard Components

All located in `frontend/app/components/dashboard/`. These are small, focused components assembled by `dashboard/page.tsx`.

#### `types.ts`
TypeScript interfaces for every data shape used in the dashboard:
- `StatCardData` — shape for the KPI summary cards
- `SalesTrendPoint` — `{ date, sales }` for the line chart
- `PaymentEntry` — `{ name, value, amount, color }` for the pie chart
- `TopProduct` — `{ rank, name, image, units, revenue }`
- `EmployeePerf` — `{ name, avatar, revenue, transactions, performance }`
- `OrderStatus` — union `'completed' | 'pending' | 'refunded'`
- `RecentOrder` — `{ id, customer, amount, status, time }`

#### `StatCard.tsx`
Renders one KPI card. Receives a `StatCardData` object. Shows icon, title, value, optional change percentage, subtext, and an optional "View Details →" link. Purely presentational.

#### `SalesTrendChart.tsx`
Recharts `LineChart` showing daily sales over time. Receives `SalesTrendPoint[]` as prop. Includes a period selector dropdown (not yet wired to API). Has a TODO comment pointing to the API endpoint needed.

#### `PaymentMethodChart.tsx`
Recharts `PieChart` (donut style) showing payment method split. Receives `PaymentEntry[]` and `currency` string. Includes a legend below the chart with percentage and formatted amount per method. Data is fetched live by the parent (`dashboard/page.tsx`).

#### `TopProductsTable.tsx`
Ranked list of best-selling products. Receives `TopProduct[]` and `currency`. Shows rank number, emoji image, name, units sold, and revenue. Has a "View All" link to `/products`. Data is placeholder until a top-selling API endpoint is built.

#### `EmployeePerformanceList.tsx`
Lists cashier performance cards. Receives `EmployeePerf[]` and `currency`. Each row shows avatar initials, name, transaction count, and revenue. A proportional background bar (width = `performance` %) gives a visual performance indicator. Data is placeholder.

#### `RecentOrdersList.tsx`
Shows the five most recent orders. Receives `RecentOrder[]` and `currency`. Each row shows order ID, customer name, amount, and a colour-coded status badge. Status colours are defined in the `STATUS_STYLES` constant within the file. Data is placeholder.

---

### 3.7 Layout Components

Every route section has its own `layout.tsx` that wraps its `page.tsx` with the sidebar, header, and auth providers. This is because there is no shared route group layout. The pattern is identical across all sections:

```
AuthProvider
  └─ ManagerGuard (manager sections only)
       └─ div.flex.h-screen
            ├─ Sidebar
            └─ div.flex-col
                 ├─ TopHeader
                 └─ main (children / page content)
```

Sections with this layout: `dashboard/`, `products/`, `categories/`, `employees/`, `stocks/`, `customers/`, `orders/`, `transactions/`, `suppliers/`, `alerts/`, `settings/`, `profile/`.

The **POS layout** (`pos/layout.tsx`) does not include the Sidebar or TopHeader — it has its own POS-specific top bar.

The **login layout** (`login/layout.tsx`) is minimal — only wraps with `StoreProvider` for theme loading.

---

### 3.8 Manager Pages

#### `app/dashboard/page.tsx`
Main manager dashboard. Fetches live payment method data from `/transactions/stats`. All other data (sales trend, top products, employee performance, recent orders) uses clearly-labelled placeholder data pending dedicated API endpoints. Assembles all dashboard sub-components.

#### `app/products/page.tsx`
Product list page. Fetches products from `/products` with `search`, `category`, and `status` query params. Displays `SummaryCards`, `ProductListHeader`, `SearchFilter`, and `ProductTable`. Opens `StockAdjustmentDrawer` for quick stock edits inline.

#### `app/products/add/page.tsx`
Add product form. Uses `ProductForm` component. On submit, posts to `POST /products`. Handles image uploads separately via `POST /products/:id/images` after the product is created.

#### `app/products/[id]/page.tsx`
Product detail view. Fetches product and its stock history from `GET /products/:id`. Displays full product info, image gallery, and `RecentStockUpdates` widget.

#### `app/products/[id]/edit/page.tsx`
Edit product form. Pre-populates `ProductForm` with existing data. Submits to `PUT /products/:id`.

#### `app/products/import/page.tsx`
CSV import page. Accepts a CSV file upload, parses it client-side, previews the rows in a table, then submits parsed rows to `POST /products/bulk/import-csv`. Shows per-row import results (success/error).

#### `app/categories/page.tsx`
Category management. Fetches categories from `/categories`. CRUD operations via inline modal. Add/edit form has name, icon (emoji picker), and colour picker. Delete shows a confirmation prompt.

#### `app/employees/page.tsx`
Employee management. Fetches employees with transaction stats. Shows a data table with name, role, email, phone, revenue, transactions, last active, and status. Manager can add new employees (triggers `POST /employees`), deactivate/activate accounts.

#### `app/stocks/page.tsx`
Stock management hub. Two tabs: **GRNs** (paginated list of goods received notes with search and date filters) and **History** (full stock movement audit trail with product, type, quantity, reason, actor).

#### `app/stocks/receive/page.tsx`
Create GRN page. Form to record received goods: supplier name, reference number, notes, and an expandable list of items (product selector, quantity, cost price). Submits to `POST /stocks/grns`.

#### `app/stocks/grn/[id]/page.tsx`
GRN detail view. Shows all metadata and line items for a single Goods Received Note.

#### `app/customers/page.tsx`
Customer list with stats cards (total customers, revenue, avg spend, new this month). Searchable table showing name, email, phone, total orders, total spent, last purchase date.

#### `app/orders/page.tsx`
Order list showing all POS orders. Filterable by status. Shows order ID, customer, amount, payment method, status badge, and time.

#### `app/transactions/page.tsx`
Transaction history — every payment event. Filterable by status and date range. Shows transaction ID, order ID, customer, payment method, amount, and status.

#### `app/suppliers/page.tsx`
Supplier directory. Lists suppliers with contact details. CRUD operations via modal.

#### `app/alerts/page.tsx`
Low stock alerts. Fetches products where `status = 'low_stock'` or `status = 'out_of_stock'`. Groups them by severity and links to each product's detail page.

#### `app/settings/page.tsx`
Store configuration page with three tabs:

- **Store Info** — Edit store name, currency, address, phone, email. Saves to `PATCH /settings`.
- **Appearance** — Upload store logo (`POST /settings/logo`) and choose primary colour (presets + custom hex picker with live preview).
- **Account** — Two sections:
  - *Profile Information:* Upload avatar, edit name and phone. Email is **read-only** (displayed but not editable). Saves to `PATCH /auth/profile` + `POST /auth/profile/avatar`.
  - *Change Password:* Current password, new password, confirm. Saves to `POST /auth/change-password`.

#### `app/profile/page.tsx`
Read-only profile view page (accessible from sidebar). Displays user avatar/initials, name, role, email, phone, last login, and placeholder activity stats.

#### `app/login/page.tsx`
Login page. Two-step: first select role (Manager or Cashier card), then enter email and password. Role selection passes `expectedRole` to `auth.login()`, which rejects mismatched accounts with an appropriate error message. Includes "Remember Me" checkbox.

---

### 3.9 POS System (`pos/`)

The POS system is a separate user-facing application within the same Next.js project. It is designed for touchscreen use by Cashiers and Sales Representatives.

#### `app/pos/layout.tsx`
Minimal layout wrapper for all POS pages. Wraps children in `AuthProvider` and `StoreProvider` only — no sidebar or header (the POS has its own `TopBar`).

#### `app/pos/login/page.tsx`
POS-specific login page. Styled differently from the manager login. Authenticates with `expectedRole: 'Cashier'` to reject Manager accounts.

#### `app/pos/register/page.tsx`
POS self-registration page for new cashier accounts.

#### `app/pos/dashboard/page.tsx`
The main POS interface. Delegates all business logic to `usePOS` hook and renders the following components: `TopBar`, a product grid (using `ProductCard`), `CartSidebar`, `CheckoutModal`, `PromoModal`, `WeightModal`.

#### `app/pos/dashboard/hooks/usePOS.ts`
The central business logic hook for the POS. Manages:
- **Product catalogue** — fetches from `/products`, caches in IndexedDB for offline use.
- **Cart state** — add item, remove item, update quantity, clear cart.
- **Category filter** — filters displayed products by selected category.
- **Customer selection** — links a customer to the current order.
- **Promo code** — validates and applies discount codes.
- **Checkout** — builds the order payload, posts to `POST /orders`, records the transaction, syncs with backend.
- **Offline mode** — if `isOnline` is false, saves order to IndexedDB via `offlineDB.savePendingOrder()`.

Returns all state and action callbacks used by the page and its child components.

#### `app/pos/dashboard/constants/pos.ts`
POS-specific constants:
- `TAX_RATE` — `0.08` (8% tax)
- `fmt(n)` — Currency formatter: `Rs. <amount>`
- `genId()` — Generates a random order ID like `ORD-AB12CD`

#### `app/pos/dashboard/constants/tokens.ts`
Design tokens for the POS interface:
- `C` object — colour palette (`brand`, `brandMid`, `accent`, `bg`, `surface`, `danger`, etc.)
- `CARD_GRADIENTS` — Array of gradient pairs for category and product card backgrounds.

#### `app/pos/dashboard/components/TopBar.tsx`
POS top navigation bar. Shows store logo/name, current cashier name, online/offline status indicator, and navigation links (POS, Customers, Transactions).

#### `app/pos/dashboard/components/ProductCard.tsx`
Individual product card displayed in the POS product grid. Shows product image (with fallback), name, and price. Tap/click adds to cart.

#### `app/pos/dashboard/components/CartSidebar.tsx`
The right-side panel showing cart contents. Lists each item with name, quantity stepper (+/−), unit price, and line total. Shows subtotal, tax, discount (if promo applied), and grand total. Contains the "Checkout" button.

#### `app/pos/dashboard/components/CheckoutModal.tsx`
Full-screen payment completion modal. Shows order summary, payment method selector (Cash/Card), amount received input, quick-amount buttons, change-to-return calculation, and customer info. Calls the `onComplete` callback with payment data.

#### `app/pos/dashboard/components/PromoModal.tsx`
Modal to enter and validate a promotional discount code. Calls `POST /promos/validate`, shows the discount value if valid, and applies it to the cart total.

#### `app/pos/dashboard/components/WeightModal.tsx`
Modal for weight-based products. Allows the cashier to enter a weight (in kg/g), calculates the price based on unit price × weight, and adds the weighted item to the cart.

#### `app/pos/transactions/page.tsx`
POS-side transaction history page. Cashiers can review their own recent transactions.

#### `app/pos/transactions/types.ts`
TypeScript interfaces for the POS transactions view. Includes:
- `Transaction` interface
- `getTodayStats(transactions[])` — helper that computes today's sales total, transaction count, success rate, and average bill from a transactions array.

#### `app/pos/transactions/TransactionTable.tsx`
Data table component for POS transactions. Columns: ID, customer, method, amount, status icon, date.

#### `app/pos/transactions/StatCards.tsx`
Four KPI cards for the POS transactions page: Today's Sales, Transaction Count, Success Rate, Average Bill. Data computed by `getTodayStats`.

#### `app/pos/transactions/StatusIcon.tsx`
Small icon component that renders the appropriate icon and colour for each transaction status (`success`, `pending`, `failed`, `refunded`, `voided`).

#### `app/pos/transactions/ActionModal.tsx`
Modal for transaction actions (view details, void, refund). Shows full transaction info and action buttons based on current status.

#### `app/pos/Customers/page.tsx`
POS customer management page. Lists customers with stats cards. Cashiers can create new customers and view customer details.

#### `app/pos/Customers/types.ts`
Re-exports `ICustomer` as `Customer` from `lib/types.ts`. Defines `CustomerStats` interface and two utility functions:
- `getInitials(name)` — two-letter avatar string
- `formatDate(date?)` — formatted date string or `'Never'`

#### `app/pos/Customers/CustomerList.tsx`
Table/list component for POS customer records. Rows show avatar, name, phone, email, total orders, total spent, last purchase.

#### `app/pos/Customers/CustomerDetailModal.tsx`
Read-only modal showing full customer profile: contact info, purchase history summary, and last purchase date.

#### `app/pos/Customers/CustomerFormModal.tsx`
Create/edit customer modal. Fields: name, email, phone. Submits to `POST /customers` or `PUT /customers/:id`.

#### `app/pos/Customers/StatCards.tsx`
Four POS customer stat cards: Total Customers, Total Revenue, Average Spend, New This Month. Data from `GET /customers/stats`.

---

## 4. How the Layers Connect

```
Browser (Next.js)
       │
       │  HTTP (Axios via lib/api.ts)
       │  Authorization: Bearer <JWT>
       ▼
Express Server (backend/src/index.ts)
       │
       │  protect() — verifies JWT
       │  requireRole() — checks role
       ▼
Controller Functions
       │
       │  Mongoose queries (always filtered by storeId)
       ▼
MongoDB Atlas
  Collections: users, products, categories, customers,
               orders, transactions, grns, stockhistories,
               suppliers, promos, storesettings
```

**Request lifecycle example — Manager creates a product:**

1. `ProductForm` (frontend) submits form data.
2. `lib/api.ts` attaches JWT from storage and sends `POST /api/products`.
3. `protect` middleware verifies JWT, attaches `req.user`.
4. `requireRole('Manager')` confirms the role is Manager.
5. `createProduct` controller picks only whitelisted fields, calls `Product.create({ ...fields, storeId })`.
6. Increments the category's `productCount` with `$inc`.
7. If opening stock > 0, writes a `StockHistory` record.
8. Returns `201 { data: product }`.
9. Frontend receives the response, navigates to the product detail page.

---

## 5. Authentication & Role Flow

```
/login  ──► Role selection (Manager / Cashier)
              │
              ▼
         POST /auth/login
         { token, user: { id, name, email, role, storeId } }
              │
     ┌────────┴────────┐
     │                 │
  Manager           Cashier / Sales Rep
     │                 │
  /dashboard        /pos/dashboard
     │
  ManagerGuard checks role on every page render
  Redirects to /login if role !== 'Manager'
```

**Token storage:**
- `rememberMe = true` → `localStorage` (persists across browser sessions)
- `rememberMe = false` → `sessionStorage` (cleared when tab closes)

**Token expiry:** On any `401` response (except the login call itself), `lib/api.ts` clears all storage and redirects to `/login`.

---

## 6. Multi-Tenancy Pattern

Every MongoDB document has a `storeId` field. Every controller reads `storeId` from `req.user.storeId` (embedded in the JWT at login time) and filters all queries with it.

```typescript
// Example — always in every controller:
const storeId = req.user!.storeId;
const products = await Product.find({ storeId });
```

This means:
- One MongoDB cluster serves multiple stores.
- A Manager from Store A can never read or modify data from Store B.
- The storeId is trusted from the JWT, not from the request body (so clients cannot spoof it).
