# 5.5.x Test cases — Inventory module

Scope note

These cases exercise the inventory module documented in 5.4.3. They are grouped by the same
sub-sections, so a case can be traced back to the feature it verifies. Authentication and
tenant-isolation cases are covered in the authentication table; the two guards that recur on
every inventory route — the `OneShop-Tenant-ID` header and `requireRole('Manager')` — are
tested once per sub-module rather than repeated on every endpoint.

Severity key — **High**: data loss, incorrect stock, or an access-control bypass.
**Medium**: incorrect display or a rejected valid input. **Low**: cosmetic or convenience.

---

## Product catalogue management

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| PRD-001 | Fetch all products as an authenticated user | Medium | Returns 200 OK with the product array and a total count. | Passed |
| PRD-002 | Reject product access without a tenant header | High | Returns 400 Bad Request stating the OneShop-Tenant-ID header is required. | Passed |
| PRD-003 | Reject product access without a JWT | High | Returns 401 Unauthorized stating no token was provided. | Passed |
| PRD-004 | Filter products by a search term matching name or SKU | Medium | Returns 200 OK with only products whose name or SKU matches, case-insensitively. | Passed |
| PRD-005 | Filter products by category | Medium | Returns 200 OK with only products belonging to the given category. | Passed |
| PRD-006 | Filter products by derived status `low-stock` | Medium | Returns 200 OK with only products whose computed status is low-stock, filtered in memory after retrieval. | Passed |
| PRD-007 | Manager creates a product with valid data | High | Returns 201 Created with the saved product, its generated slug and its computed status. | Passed |
| PRD-008 | Cashier attempts to create a product | High | Returns 403 Forbidden and no product is written. | Passed |
| PRD-009 | Create a product with a missing required field (SKU) | High | Request is rejected with the validation message "SKU is required" and nothing is persisted. | Passed |
| PRD-010 | Create a product with a negative selling price | Medium | Request is rejected with "Selling price must be non-negative". | Passed |
| PRD-011 | Fetch a single product by ID together with its stock history | Medium | Returns 200 OK with the product and its 20 most recent stock movements, newest first. | Passed |
| PRD-012 | Fetch a product using a non-existent ID | Medium | Returns 404 Not Found with the message "Product not found". | Passed |
| PRD-013 | Manager updates a product's selling price | High | Returns 200 OK with the updated document reflecting the new price. | Passed |
| PRD-014 | Cashier attempts to update a product | High | Returns 403 Forbidden and the stored product is unchanged. | Passed |
| PRD-015 | Cashier attempts to delete a product | High | Returns 403 Forbidden and the product remains retrievable. | Passed |
| PRD-016 | Manager deletes a product | High | Returns 200 OK "Product deleted successfully"; a subsequent fetch returns 404. | Passed |
| PRD-017 | Deleting a product removes its stock history | Medium | No StockHistory documents remain referencing the deleted product, leaving no orphaned movement rows. | Passed |
| PRD-018 | Creating a product increments its category's product counter | Medium | The owning category's productCount increases by one. | Passed |
| PRD-019 | Upload product images without attaching a file | Low | Returns 400 Bad Request with "No files uploaded". | Passed |

### Derived stock status

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| PRD-020 | Status of a product whose stock is 0 | High | The status virtual returns `out-of-stock`. | Passed |
| PRD-021 | Status of a product whose stock equals its low-stock threshold | High | The status virtual returns `low-stock` (the comparison is inclusive). | Passed |
| PRD-022 | Status of a product whose stock exceeds its threshold | Medium | The status virtual returns `in-stock`. | Passed |
| PRD-023 | Status stays in step after a stock change | High | Reducing stock below the threshold changes the reported status without any separate write, because status is computed rather than stored. | Passed |

---

## Stock adjustment and audit trail

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| STK-001 | Manager adds 50 units to a product holding 100 | High | Returns 200 OK with stock 150 and an `add` audit row of quantity 50. | Passed |
| STK-002 | Manager removes 20 units from a product holding 150 | High | Returns 200 OK with stock 130 and a `remove` audit row of quantity 20. | Passed |
| STK-003 | Remove more units than are in stock | High | Returns 400 Bad Request with "Insufficient stock"; the stock level is unchanged and no audit row is written. | Passed |
| STK-004 | Remove exactly the remaining stock | Medium | Returns 200 OK with stock 0; the product's status becomes out-of-stock. | Passed |
| STK-005 | Submit an adjustment type other than add or remove | Medium | Returns 400 Bad Request with 'Adjustment type must be "add" or "remove"'. | Passed |
| STK-006 | Submit a quantity of zero or a negative quantity | High | Returns 400 Bad Request with "Quantity must be a positive integer". | Passed |
| STK-007 | Submit a fractional quantity such as 2.5 | Medium | Returns 400 Bad Request with the same integer validation message. | Passed |
| STK-008 | Adjust stock on a product that does not exist | Medium | Returns 404 Not Found with "Product not found". | Passed |
| STK-009 | Cashier attempts a stock adjustment | High | Returns 403 Forbidden and the stock level is unchanged. | Passed |
| STK-010 | Audit row attribution | High | The StockHistory row records the acting manager's email address and the free-text reason exactly as entered. | Passed |
| STK-011 | Opening stock on product creation writes an audit row | Medium | A single `add` row is written with quantity equal to the opening stock and the reason "Initial Stock". | Passed |
| STK-012 | Creating a product with zero opening stock | Low | No audit row is written, since there was no movement to record. | Passed |
| STK-013 | A completed POS sale appends a removal row | High | Stock decreases by the quantity sold and a `remove` row is written with the reason "POS Transaction TXN-#####". | Passed |
| STK-014 | Voiding a POS sale appends a compensating row | High | Stock is restored and an `add` row with the reason "Transaction voided: TXN-#####" is appended; the original removal row is retained rather than deleted. | Passed |
| STK-015 | Voiding an already-voided transaction | Medium | Returns 400 Bad Request with "Transaction already voided" and stock is not restored twice. | Passed |
| STK-016 | Filter the movement ledger by type | Low | Requesting type=remove returns only removal rows, paginated with total and page count. | Passed |
| STK-017 | Filter the movement ledger by product and date range | Low | Returns only that product's movements within the range, with the end date normalised to 23:59:59.999. | Passed |

---

## Goods received note (GRN)

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| GRN-001 | Manager receives a delivery of two valid line items | High | Returns 201 Created with the saved GRN; both products' stock is incremented and two `add` audit rows are appended. | Passed |
| GRN-002 | Submit a GRN with an empty item list | Medium | Returns 400 Bad Request with "At least one item is required". | Passed |
| GRN-003 | Submit a line item with no product reference | High | Returns 400 Bad Request naming the offending line — "Item n: product is required". | Passed |
| GRN-004 | Submit a line item with a quantity of zero or a fraction | High | Returns 400 Bad Request with "Item n: quantity must be a positive integer". | Passed |
| GRN-005 | Submit a line item with a negative cost price | Medium | Returns 400 Bad Request with "Item n: cost price cannot be negative". | Passed |
| GRN-006 | Submit a line item referencing a product that does not exist | High | Returns 404 Not Found with "Item n: product not found". | Passed |
| GRN-007 | Validate-then-commit — a three-line delivery whose third line is invalid | High | The whole request is rejected and the stock of the products on lines one and two is unchanged, because no writes begin until every line has passed validation. | Passed |
| GRN-008 | Sequential GRN numbering within a year | Medium | The first note is numbered GRN-2026-0001 and the next GRN-2026-0002, zero-padded to four digits. | Passed |
| GRN-009 | Numbering restarts in a new calendar year | Low | The first note of the following year is numbered GRN-2027-0001. | Passed |
| GRN-010 | Product name and SKU are snapshotted onto the note | Medium | After the product is renamed, the stored GRN still displays the name and SKU carried at the time of receipt. | Passed |
| GRN-011 | Totals are computed from the line items | Medium | totalItems equals the sum of quantities and totalCost the sum of quantity × cost price. | Passed |
| GRN-012 | Cashier attempts to create a GRN | High | Returns 403 Forbidden and no stock is received. | Passed |
| GRN-013 | List GRNs with default pagination | Low | Returns 200 OK with data, total, page and page-count fields, newest first. | Passed |
| GRN-014 | Search GRNs by number, supplier or reference | Low | Returns 200 OK with only the notes matching the term, case-insensitively. | Passed |
| GRN-015 | Request a page size above the maximum | Low | The page size is clamped to 50 rather than honouring the oversized request. | Passed |
| GRN-016 | Open a GRN detail view with an unknown ID | Low | Returns 404 Not Found with "GRN not found". | Passed |

---

## Bulk CSV product import

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| CSV-001 | Import a file in which every row is valid | High | Returns 200 OK with imported equal to the row count, failed 0 and an empty error list. | Passed |
| CSV-002 | Submit an import with an empty or non-array rows payload | Medium | Returns 400 Bad Request with "No rows provided". | Passed |
| CSV-003 | Import a row with a blank product name | High | That row is counted as failed with "Product name is required" against its 1-based row number; the remaining rows still import. | Passed |
| CSV-004 | Import a row with a blank SKU | High | That row fails with "SKU is required" and the batch continues. | Passed |
| CSV-005 | Import a row with a selling price of zero or below | High | That row fails with "Selling price must be greater than 0" and the batch continues. | Passed |
| CSV-006 | Import a row that breaks several rules at once | Medium | All applicable messages are returned together for that single row. | Passed |
| CSV-007 | Import a 200-row file containing one duplicate SKU on row 40 | High | Row 40 alone fails with "Duplicate SKU or invalid data" and the other 199 products are imported, because each row is processed in its own try/catch. | Passed |
| CSV-008 | SKU normalisation | Low | The stored SKU is trimmed and upper-cased regardless of the casing supplied in the file. | Passed |
| CSV-009 | Import a row with no category supplied | Medium | The product is created under the default category "Uncategorized". | Passed |
| CSV-010 | Import a row omitting the optional numeric columns | Medium | Cost price defaults to 0, stock to 0 and the low-stock threshold to 10. | Passed |
| CSV-011 | Cashier attempts a bulk import | High | Returns 403 Forbidden and no products are created. | Passed |
| CSV-012 | Server-side re-validation when the client is bypassed | High | Calling the endpoint directly with rows the browser would have rejected produces the same per-row errors, confirming client-side parsing is not trusted. | Passed |
| CSV-013 | Parse a quoted field containing a comma | Medium | "Lay's Classic Chips, 100g" survives as a single field rather than splitting into two columns, because the parser only treats a comma as a delimiter outside quotes. | Passed |
| CSV-014 | Parse headers in a different order or casing | Low | Headers are lower-cased and spaces converted to underscores, so columns map correctly regardless of the order used in the file. | Passed |
| CSV-015 | Preview invalid rows before submission | Medium | The review step displays a per-row error badge for every invalid row, so the file can be corrected before importing. | Passed |

---

## Low-stock detection and alerts

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| ALT-001 | Retrieve the low-stock alert list | High | Returns 200 OK with only products satisfying 0 < stock ≤ their own threshold. | Passed |
| ALT-002 | Zero-stock items are excluded from the low-stock list | High | A product holding no stock does not appear in low-stock; it is reported by the out-of-stock endpoint instead. | Passed |
| ALT-003 | Per-product thresholds are honoured | High | A product with stock 15 against a threshold of 20 is flagged, while one with stock 15 against a threshold of 10 is not — confirming the two fields are compared within the same document. | Passed |
| ALT-004 | Low-stock ordering | Medium | Results are sorted ascending by stock so the most urgent item appears first. | Passed |
| ALT-005 | Retrieve the out-of-stock alert list | High | Returns 200 OK with only products whose stock is exactly 0. | Passed |
| ALT-006 | Retrieve the no-sales alert list with the default window | Medium | Returns products that appear in no non-cancelled order in the last 7 days. | Passed |
| ALT-007 | Override the no-sales window | Low | Requesting days=30 widens the cut-off accordingly. | Passed |
| ALT-008 | A product sold within the window is excluded from no-sales | Medium | The product disappears from the list once a non-cancelled order containing it exists inside the window. | Passed |
| ALT-009 | Retrieve the inactive-staff alert list | Medium | Returns only users whose isActive flag is false. | Passed |
| ALT-010 | Inactive staff member who has never logged in | Low | The row reports a last login of "Never" and zero days inactive rather than an invalid date. | Passed |
| ALT-011 | One alert category failing does not block the others | Medium | With the categories fetched concurrently, a failing category leaves the remaining cards rendered rather than blanking the page. | Passed |
| ALT-012 | Alert counts agree with the underlying lists | Medium | Each count card matches the number of rows in its detail list. | Passed |

---

## Category management

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| CTG-001 | List categories | Medium | Returns 200 OK with the categories sorted by name and a total count. | Passed |
| CTG-002 | Product counts are recomputed on read | High | The productCount shown is derived by aggregating the products collection, overwriting the value stored on the category document. | Passed |
| CTG-003 | Counts reflect products created outside createProduct | High | A product added through CSV import — which never increments the stored counter — is still included in the displayed count, so counter drift is invisible to the user. | Passed |
| CTG-004 | Manager creates a category with only a name | Medium | Returns 201 Created with the default icon 📦 and the default colour #155dfc applied. | Passed |
| CTG-005 | Create a category with a blank or whitespace-only name | Medium | Returns 400 Bad Request with "Category name is required". | Passed |
| CTG-006 | Create a category whose name already exists in the same store | High | Returns 409 Conflict with "Category with this name already exists", mapped from the driver's duplicate-key error. | Passed |
| CTG-007 | The same category name in a different store | High | Returns 201 Created, because uniqueness is enforced on the storeId and name pair rather than on name alone. | Passed |
| CTG-008 | Slug generation from a name containing punctuation | Low | "Dairy & Eggs" is stored with the URL-safe slug `dairy-eggs`. | Passed |
| CTG-009 | Cashier attempts to create, update or delete a category | High | Returns 403 Forbidden in each case. | Passed |
| CTG-010 | Update a category that does not exist | Low | Returns 404 Not Found with "Category not found". | Passed |
| CTG-011 | Manager deletes a category | Medium | Returns 200 OK with "Category deleted successfully". | Passed |
| CTG-012 | Clicking a category card | Low | Routes to the products list pre-filtered to that category. | Passed |

---

## Supplier management

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| SUP-001 | List suppliers | Low | Returns 200 OK with suppliers sorted by name and a total count. | Passed |
| SUP-002 | Search suppliers | Medium | A single query matches across name, contact person, email and phone, case-insensitively. | Passed |
| SUP-003 | Filter suppliers by status | Low | Returns only active or only inactive suppliers; the value "all" applies no filter. | Passed |
| SUP-004 | Retrieve supplier summary statistics | Medium | Returns total, active, inactive and the count of distinct categories supplied across all suppliers. | Passed |
| SUP-005 | Manager creates a supplier with valid details | Medium | Returns 201 Created with the saved supplier. | Passed |
| SUP-006 | Create a supplier with a blank name | Medium | Returns 400 Bad Request with "Supplier name is required". | Passed |
| SUP-007 | Create a supplier whose name already exists | Medium | Returns 409 Conflict with "A supplier with this name already exists". | Passed |
| SUP-008 | Submit a comma-separated category list with a trailing comma | Low | Each entry is trimmed and empty entries are discarded, so no blank category is stored. | Passed |
| SUP-009 | Record a category that does not exist in the catalogue | Low | The supplier is saved successfully, since categories are held as plain strings rather than references. | Passed |
| SUP-010 | Display a supplier dealing in eight categories | Low | The row shows the first two categories as chips and collapses the rest into a "+6" badge without stretching the row height. | Passed |
| SUP-011 | Fetch or delete a supplier that does not exist | Low | Returns 404 Not Found with "Supplier not found". | Passed |
| SUP-012 | Cashier attempts to create, update or delete a supplier | High | Returns 403 Forbidden in each case. | Passed |
| SUP-013 | Delete a supplier from the interface | Medium | The action is only carried out after the confirmation dialog is accepted. | Passed |

---

## Management dashboard aggregation

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| DSH-001 | Load the dashboard summary | Medium | Returns 200 OK with every tile populated from a single concurrent batch of queries. | Passed |
| DSH-002 | Revenue merges both sales channels | High | A day carrying both an in-store transaction and an online order reports the sum of the two rather than either one alone. | Passed |
| DSH-003 | Top-products leaderboard merges both channels | Medium | A product sold through both channels is listed once with the combined quantity. | Passed |
| DSH-004 | Trend series covers days with no trading | Medium | Days with no sales appear in the series with a value of zero, so the chart does not draw a straight line implying sales that never happened. | Passed |
| DSH-005 | "Today" scoping | High | Only records created between midnight today and midnight tomorrow are counted; a sale from late yesterday is excluded. | Passed |
| DSH-006 | Day-over-day change when the previous day had sales | Medium | The percentage change is reported against the same window shifted back twenty-four hours. | Passed |
| DSH-007 | Day-over-day change when the previous day had no sales | High | The comparison returns null and the interface omits it, rather than dividing by zero and showing an infinite growth figure. | Passed |
| DSH-008 | One dashboard widget failing | Medium | The failing widget degrades on its own while the remaining widgets still render, because each request carries its own error handler. | Passed |

---

## Employee management

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| EMP-001 | List employees with performance figures | Medium | Returns 200 OK with each employee's revenue, transaction count, last-active time and status. | Passed |
| EMP-002 | Revenue attribution for a Cashier | High | Revenue is credited from POS transactions the cashier created. | Passed |
| EMP-003 | Revenue attribution for a Manager | High | Revenue is credited from online orders the manager confirmed, so a manager does not show zero despite handling every online order. | Passed |
| EMP-004 | Employee with no activity in the selected period | Medium | The employee remains on the roster with zero revenue rather than being omitted. | Passed |
| EMP-005 | "This Month" date preset | Medium | The range runs from the first of the month at 00:00:00 to the last day at 23:59:59.999 regardless of when the query is issued. | Passed |
| EMP-006 | Custom date range | Medium | The supplied start and end dates are normalised to the start and end of their days before filtering. | Passed |
| EMP-007 | Filter employees by role and status | Low | Returns only employees matching the selected role and active/inactive state. | Passed |
| EMP-008 | Debounced employee search | Low | Typing a name issues one request after the 300 ms pause rather than one request per keystroke. | Passed |
| EMP-009 | Manager adds an employee | High | Returns 201 Created; the password is hashed by the reused registration handler rather than by duplicated logic. | Passed |
| EMP-010 | Cashier attempts to add an employee | High | Returns 403 Forbidden. | Passed |
| EMP-011 | Manager deactivates an employee | High | Returns 200 OK "Employee deactivated"; isActive becomes false and the record is retained. | Passed |
| EMP-012 | A deactivated employee attempts to log in | High | Login is refused while the account remains inactive. | Passed |
| EMP-013 | Audit trail survives deactivation | High | Transactions and stock-history rows referencing the deactivated employee remain intact, so the performance report is not retrospectively broken. | Passed |
| EMP-014 | A deactivated employee appears in the inactive-staff alert | Medium | The same isActive flag drives both deactivation and alerting, so the two cannot drift apart. | Passed |
| EMP-015 | Manager reactivates an employee | Medium | Returns 200 OK "Employee activated" and isActive returns to true. | Passed |
| EMP-016 | Deactivation control for a Manager account | High | The control is hidden for accounts whose role is Manager, so the store owner cannot lock themselves out of their own store. | Passed |
| EMP-017 | Cashier attempts to deactivate an employee | High | Returns 403 Forbidden. | Passed |

---

## Store settings and branding

| Test Case ID | Test Case | Severity | Expected Result | Test Result |
|---|---|---|---|---|
| SET-001 | Fetch settings before any user has authenticated | High | Returns 200 OK with the store's branding, so the login screen can be styled correctly. | Passed |
| SET-002 | Fetch settings without a tenant header | High | Returns 400 Bad Request stating the OneShop-Tenant-ID header is required. | Passed |
| SET-003 | Subscription plan is returned read-only | High | The plan is read from the platform's tenant registry with a projection limited to that one field, and no write path to it exists anywhere in the module. | Passed |
| SET-004 | The tenant registry is unreachable | Medium | The settings page still loads with the plan falling back to "free" rather than failing outright. | Passed |
| SET-005 | Manager updates the store name and contact details | Medium | Returns 200 OK with the updated settings document. | Passed |
| SET-006 | Payload containing storeId or subscriptionPlan | High | Those fields are ignored because only whitelisted fields are copied into the update, so neither value changes. | Passed |
| SET-007 | Submit a colour without a leading hash ("155dfc") | Medium | The value is normalised to #155dfc and saved. | Passed |
| SET-008 | Submit a colour with repeated hashes ("##155dfc") | Medium | The value normalises to #155dfc and is saved. | Passed |
| SET-009 | Submit a malformed colour ("red" or "#12345") | High | The value fails the six-digit hexadecimal check and is silently ignored, leaving the previous colour in place rather than propagating an invalid value into every CSS variable. | Passed |
| SET-010 | Submit a blank store name | Medium | The blank value is not copied and the existing store name is retained. | Passed |
| SET-011 | Submit a blank address | Medium | The blank value is accepted and the address is cleared, since an address may legitimately be emptied. | Passed |
| SET-012 | Saved colour propagates across the application | Medium | One save restyles the management dashboard, POS terminal and storefront through the shared CSS custom property, with no rebuild and no per-component change. | Passed |
| SET-013 | Replace the store logo | Low | The new logo appears immediately because the URL carries a cache-busting timestamp rather than being served from the browser cache. | Passed |
| SET-014 | Submit a logo upload with no file attached | Low | Returns 400 Bad Request with "No file uploaded". | Passed |
| SET-015 | Cashier attempts to update settings or upload a logo | High | Returns 403 Forbidden in both cases. | Passed |

---

## Automated regression suite

Twelve of the cases above are automated with Jest and Supertest against an in-memory MongoDB
instance, so the product lifecycle and its access control are re-verified on every run rather
than by hand. The suite seeds a Manager directly, obtains a Cashier account through the
registration endpoint, and then exercises the two roles against the same routes.

| Test Case ID | Automated case | Covers |
|---|---|---|
| PRD-002 | rejects requests without tenant header | Tenant guard |
| PRD-003 | rejects requests without auth token | Authentication guard |
| PRD-007 | Manager can create a product | Product creation |
| PRD-008 | Cashier cannot create a product | Role guard |
| PRD-001 | Cashier can list products | Read access for any role |
| PRD-011 | Manager can get a single product | Detail retrieval |
| PRD-012 | returns 404 for unknown product | Not-found handling |
| PRD-013 | Manager can update a product | Product update |
| STK-001 | Manager can add stock | Stock increase |
| STK-002 | Manager can remove stock | Stock decrease |
| STK-009 | Cashier cannot adjust stock | Role guard on adjustment |
| PRD-015 | Cashier cannot delete a product | Role guard on deletion |
| PRD-016 | Manager can delete a product | Product deletion |

The file is `backend/src/__tests__/inventory.test.ts` and the suite runs with `npm test`.

---

## Observations arising from testing

Two points emerged during test design that are worth recording rather than hiding behind a
uniform pass column.

**Inconsistent duplicate-key handling.** Categories and suppliers translate the driver's
duplicate-key error into a 409 Conflict with a specific message. Products do not — a duplicate
SKU submitted to `POST /api/products` falls through to the generic error handler and surfaces
as a 500. The behaviour is safe, in that the duplicate is still refused, but the status code
misreports a client error as a server fault. Applying the same 11000 mapping used in the
category controller would align the three.

**Validation failures are reported as 500.** For the same reason, a product rejected by schema
validation (PRD-009, PRD-010) returns 500 carrying the validation message rather than a 400.
The message reaching the interface is correct and specific; only the status code is wrong.
Both cases are recorded here as a limitation rather than as a functional defect, since neither
allows invalid data to be written.
