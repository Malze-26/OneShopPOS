5.4.3 INVENTORY MODULE

Scope note

OneShop is sold as a subscription to independent shops. The platform operator provisions
each store, sets its subscription plan and performs the initial configuration; that layer,
along with the multi-tenant database architecture and the authentication primitives, is
documented in the admin and tenant management section. This section covers everything a
store manager controls inside their own shop once it has been handed over. Where the two
meet — the read-only subscription plan shown in Settings and the role guard reused on every
write — the dependency is noted and cross-referenced rather than re-described.


================================================================================
5.4.3.1  PRODUCT CATALOGUE MANAGEMENT
================================================================================

Trigger
    Manager opens the Products page, or submits the add / edit product form.

Frontend
    The list page renders a searchable, category-filterable table with a live product
    count. Search and category filter are held as React state and passed down to the table
    component, which re-queries on change. Detail, add, edit and CSV-import each occupy
    their own route under app/products/.

Backend
    Six handlers in productController.ts. Reads are open to any authenticated user; every
    write is wrapped in requireRole('Manager'). Creating a product also increments the
    owning category's product counter and, when opening stock is non-zero, writes an
    "Initial Stock" row to the audit trail.

Route table and access control

    Method and path                       Handler               Role
    --------------------------------------------------------------------------------
    GET    /api/products                  getProducts           Any authenticated
    GET    /api/products/stats            getProductStats       Any authenticated
    GET    /api/products/:id              getProduct            Any authenticated
    POST   /api/products                  createProduct         Manager
    PUT    /api/products/:id              updateProduct         Manager
    DELETE /api/products/:id              deleteProduct         Manager
    POST   /api/products/:id/adjust-stock adjustStock           Manager
    POST   /api/products/bulk/import-csv  importCSV             Manager
    POST   /api/products/:id/images       uploadProductImages   Manager

Derived stock status

Product status is not stored. It is a Mongoose virtual computed from the current stock
level against the product's own threshold, which guarantees the label can never drift out
of sync with the underlying quantity. The rule is:

    stock = 0                    ->  out-of-stock
    stock <= lowStockThreshold   ->  low-stock
    otherwise                    ->  in-stock

A consequence worth noting is that because a virtual has no column in MongoDB, it cannot
appear in a query filter. Status filtering is therefore applied in memory after retrieval,
whereas name, SKU and category filtering are pushed down into the database query.

Cascade on create and delete

Product lifecycle events maintain records outside the product collection itself. Creating a
product increments the productCount held on its category document, and deleting one
decrements that count and removes the product's stock history. Removing the stock history
alongside the product prevents orphaned movement rows that reference an entity no longer in
the catalogue. The category counter is discussed further in 5.4.3.6, where the read path is
shown to recompute it rather than trust it.


================================================================================
5.4.3.2  STOCK ADJUSTMENT AND AUDIT TRAIL
================================================================================

Trigger
    Manager opens the stock adjustment modal on the product detail page and submits a
    direction, quantity and reason.

Frontend
    A modal collects the adjustment type (add / remove), an integer quantity and a
    free-text reason. On success the product detail view refreshes both the stock figure
    and the recent-movement list beneath it.

Backend
    adjustStock validates the payload, guards against driving stock negative, persists the
    new level, and writes an immutable StockHistory document attributing the change to the
    acting user's email address.

Algorithm — POST /api/products/:id/adjust-stock

    INPUT   type in {add, remove}, quantity, reason

    1.  IF type NOT IN {add, remove}           -> 400 "Adjustment type must be add or remove"
    2.  IF quantity NOT integer OR quantity< 1 -> 400 "Quantity must be a positive integer"
    3.  product <- Product.findById(id)
    4.  IF product NOT found                   -> 404 "Product not found"
    5.  newStock <- (type = add) ? product.stock + quantity
                                 : product.stock - quantity
    6.  IF newStock < 0                        -> 400 "Insufficient stock"
    7.  product.stock <- newStock ; SAVE product
    8.  CREATE StockHistory { product, type, quantity, reason,
                              by = user.email, storeId }
    9.  RETURN 200 updated product

Flowchart

    Open modal -> Type valid? -> Quantity >= 1? -> Fetch product -> Compute newStock
    -> newStock >= 0? -> Save product -> Write history row

The audit trail as a shared ledger

StockHistory is not written only by manual adjustment. Every code path that alters stock
appends to the same collection with a distinguishing reason string, which is what makes the
Stock Movements tab a complete account of inventory motion.

    Source                            Type          Reason written
    --------------------------------------------------------------------------------
    createProduct                     add           Initial Stock
    adjustStock                       add/remove    Manager's free-text reason
    createGRN                         add           GRN: GRN-2026-0001 - Supplier
    createTransaction (POS sale)      remove        POS Transaction TXN-#####
    voidTransaction                   add           Transaction voided: TXN-#####

The last two rows are the integration seam with the POS module described in 5.4.2 — a
completed sale decrements stock and appends a removal row, and voiding that sale restores
the quantity and appends a compensating addition rather than deleting the original record.


================================================================================
5.4.3.3  GOODS RECEIVED NOTE (GRN)
================================================================================

Trigger
    Manager clicks "Receive Goods" and submits a delivery with one or more line items.

Frontend
    app/stocks/receive presents a line-item builder — product picker, quantity received and
    unit cost per row, with a running total. The Stocks page lists all GRNs with search and
    pagination; each row links to a printable detail view at app/stocks/grn/[id].

Backend
    createGRN validates every line before writing anything, resolves each product to
    snapshot its name and SKU onto the document, allocates a sequential GRN number, then
    increments stock and appends an audit row per line.

Validate-then-commit

Validation runs as a complete first pass over all items. Only once every line has passed
does the handler begin writing, so a delivery with a bad row on line three does not leave
lines one and two already applied to stock. Each line is checked for a present product
reference, a positive integer quantity, a non-negative cost price, and an existing product
record; any failure returns an error naming the offending line number.

Snapshotting productName and sku onto the GRN line is deliberate: a goods received note is
a historical business document, so it must continue to show what was received under the
name it carried at the time, even if the product is later renamed or deleted.

Algorithm — sequential GRN numbering

    prefix <- "GRN-" + currentYear + "-"

    last   <- GRN.findOne({ grnNumber matches ^prefix })
                 .sort(grnNumber DESCENDING)

    next   <- last EXISTS ? parseInt(last.grnNumber minus prefix) + 1
                          : 1

    RETURN prefix + zeroPad(next, PAD_LENGTH)        e.g. GRN-2026-0007

Numbering restarts each calendar year because the prefix embeds the year, and the
descending sort is lexicographic — which is safe precisely because the numeric part is
zero-padded to a fixed width.

Flowchart

    Build line items -> All lines valid? -> Resolve products -> Total quantity and cost
    -> Allocate GRN number -> Save GRN -> Increment stock (per line)
    -> Append history row (per line)


================================================================================
5.4.3.4  BULK CSV PRODUCT IMPORT
================================================================================

Trigger
    Manager uploads or drag-drops a .csv file on the import page.

Frontend
    A four-step wizard — download template, upload file, review, import. The file is parsed
    entirely in the browser and rendered as a preview table with per-row error badges, so
    invalid rows are visible before submission.

Backend
    importCSV re-validates every row server-side and processes each inside its own
    try/catch, accumulating counts of imported and failed rows plus a per-row error list.

Two-stage validation

Client-side parsing exists for immediate feedback, not for trust. The same three
required-field rules are enforced again on the server, because a client can be bypassed
entirely by calling the endpoint directly.

The browser parser walks each line character by character, toggling an "inQuotes" flag on
every double-quote and only treating a comma as a delimiter when that flag is false. This
is what allows a product name containing a comma — "Lay's Classic Chips, 100g" — to survive
parsing as a single field rather than splitting into two columns. Headers are normalised to
lowercase with spaces converted to underscores, so the template's column order does not
have to be preserved.

Algorithm — server-side batch import

    results <- { imported: 0, failed: 0, errors: [] }

    FOR each row i IN rows:
        rowErrors <- []
        IF row.name is blank        -> rowErrors += "Product name is required"
        IF row.sku is blank         -> rowErrors += "SKU is required"
        IF row.selling_price <= 0   -> rowErrors += "Selling price must be > 0"

        IF rowErrors not empty:
            results.failed++ ; results.errors += { row: i+1, rowErrors }
            CONTINUE                       (skip this row, do not abort the batch)

        TRY
            CREATE Product { ...row, sku: UPPERCASE(sku),
                             category: row.category OR "Uncategorized",
                             defaults for cost / stock / threshold }
            results.imported++
        CATCH
            results.failed++
            results.errors += { row: i+1, ["Duplicate SKU or invalid data"] }

    RETURN results

The per-row try/catch is the important design decision: a duplicate SKU on row 40 of a
200-row file fails that row alone and reports it by line number, rather than aborting the
transaction and discarding 199 valid products.


================================================================================
5.4.3.5  LOW-STOCK DETECTION AND ALERTS
================================================================================

Trigger
    Manager opens the Alerts page, or the dashboard loads its low-stock tile.

Frontend
    Three alert categories are fetched concurrently with Promise.all, so one slow or
    failing category cannot block the others. Each renders a count card and a detail list
    with a deep link into the relevant management page.

Backend
    Three aggregation endpoints under /api/alerts. Low-stock is the interesting one — it
    compares two fields within the same document.

Per-product thresholds

Each product carries its own lowStockThreshold, so "low" is not a single global number — a
carton of milk and a television have very different reorder points. Standard MongoDB query
operators compare a field to a constant and cannot compare two fields of the same document,
so the query uses the $expr operator to evaluate an aggregation expression inside the match
stage. The condition is:

    stock > 0  AND  stock <= lowStockThreshold

The first clause deliberately excludes items that have already reached zero — those are a
separate, more severe condition served by the out-of-stock endpoint, and mixing them would
bury genuinely reorderable items in a list dominated by products that are already
unavailable. Results are sorted ascending by stock so the most urgent item appears first.

Alert categories

    Endpoint                  Condition                                Purpose
    --------------------------------------------------------------------------------
    /alerts/low-stock         0 < stock <= threshold                   Reorder before stockout
    /alerts/out-of-stock      stock = 0                                Unavailable to sell
    /alerts/no-sales          Not in any order for N days (default 7)  Identify dead stock
    /alerts/inactive-staff    isActive = false                         Review staffing

The no-sales check runs in two stages — first aggregating the set of product IDs that
appear in any non-cancelled order since the cutoff date, then selecting products whose ID
falls outside that set.


================================================================================
5.4.3.6  CATEGORY MANAGEMENT
================================================================================

Trigger
    Manager adds, edits or deletes a category, or clicks a category card to browse the
    products inside it.

Frontend
    A responsive card grid. Each card carries an emoji icon, a colour chosen from an
    eight-swatch palette, the live product count, and a proportional fill bar. Clicking a
    card routes to the products list pre-filtered to that category. A dashed "Add New
    Category" tile closes the grid so the primary action is always visible without
    scrolling to a toolbar.

Backend
    CRUD at /api/categories. Reads are open to any authenticated user in the store; create,
    update and delete are restricted to requireRole('Manager').

Counts are recomputed, not trusted

Although the schema carries a productCount field maintained by the product handlers, the
list endpoint does not read it. It runs a grouping aggregation over the products collection
and overwrites the stored value on the way out.

This makes the displayed figure self-correcting. The incremental counters described in
5.4.3.1 can drift out of step with reality — a product imported through CSV, for instance,
never passes through createProduct and so never increments its category. Because the read
path derives the count from the products themselves, that drift is invisible to the user
and the grid always reflects the true catalogue.

Uniqueness and error mapping

Category names are unique within a store, enforced by a compound index on storeId and name
rather than a plain unique constraint — two different stores may both have a "Beverages"
category without collision. The controller translates the resulting driver-level duplicate
key error (code 11000) into a 409 response carrying the message "Category with this name
already exists", so the interface can show a specific message instead of a generic failure.

A slug is derived from the name by a pre-save hook, lowercasing and replacing any run of
non-alphanumeric characters with a single hyphen, which gives "Dairy & Eggs" the URL-safe
form dairy-eggs.


================================================================================
5.4.3.7  SUPPLIER MANAGEMENT
================================================================================

Trigger
    Manager creates, edits, deletes or searches a supplier, or opens one for detail.

Frontend
    A searchable table with a status filter and client-side pagination, backed by four
    summary tiles (total, active, inactive, categories supplied). Clicking a supplier name
    opens a slide-over detail panel; edit and delete are reachable from both the row and
    the panel, with deletion behind a confirmation dialog.

Backend
    CRUD at /api/suppliers plus a /api/suppliers/stats aggregation for the tiles. Search
    matches across name, contact person, email and phone in a single query.

Categories supplied

Suppliers store their product categories as a string array rather than as references, which
keeps the vendor register independent of the category collection — a supplier can be
recorded as dealing in a category before that category exists in the catalogue. The form
accepts a comma-separated list, trims each entry and discards empty ones so that trailing
commas do not create blank categories.

The table shows the first two categories as chips and collapses the remainder into a "+n"
badge, so a supplier dealing in eight categories does not stretch the row height beyond its
neighbours.


================================================================================
5.4.3.8  MANAGEMENT DASHBOARD AGGREGATION
================================================================================

Trigger
    Manager loads the dashboard.

Frontend
    Six independent requests fire in parallel from a single effect, each updating its own
    slice of state. Because every call carries its own error handler, one failing widget
    degrades alone instead of blanking the page. Charts are rendered with Recharts.

Backend
    Six endpoints under /api/dashboard. The summary handler issues thirteen queries
    concurrently inside a single Promise.all, so the endpoint's latency is that of its
    slowest query rather than the sum of all thirteen.

Merging two sales channels

Sales arrive through two collections — Transaction for in-store POS sales and Order for
online orders. Every dashboard metric therefore runs its aggregation twice and merges the
results, keyed by day for the trend and by product for the leaderboard. The two result sets
are folded into a single Map, summing where a key appears in both.

A second detail worth reporting: the loop that builds the final series iterates over every
date in the window and substitutes zero where the map has no entry. Without this, days with
no trading would be absent from the array entirely and the chart would draw a continuous
line straight across them, visually implying sales that never happened.

Day-boundary scoping

"Today" is computed as an explicit half-open range rather than a date comparison, so the
query can use an index and results align with the store's local day:

    today    <- now with time set to 00:00:00.000
    tomorrow <- today + 1 day

    match:  { status: 'success', createdAt: { >= today, < tomorrow } }

Day-over-day change is reported as a percentage against the same range shifted back
twenty-four hours, and returns null rather than zero when the prior day had no sales —
dividing by zero would otherwise produce a meaningless infinite growth figure, so the
interface omits the comparison entirely in that case.


================================================================================
5.4.3.9  EMPLOYEE MANAGEMENT
================================================================================

Trigger
    Manager opens the Employees page, adds a member of staff, changes a filter or date
    range, or deactivates an account.

Frontend
    Search, role and status filters sit above a table showing each employee's revenue,
    transaction count, last-active timestamp and status. A four-option date selector
    (Today / Last 7 Days / This Month / Custom) rescopes the performance figures, with
    Custom opening a start-end date popover. Search is debounced by 300 ms so typing a name
    issues one request rather than one per keystroke.

Backend
    getEmployees combines a filtered user query with two performance aggregations in a
    single Promise.all. Adding an employee reuses the authentication module's register
    handler behind requireRole('Manager'), so password hashing and validation are not
    duplicated.

Role-differentiated revenue attribution

Not every role earns revenue the same way, so performance is measured against a different
collection depending on the employee's role:

    Cashier / Sales Representative   credited via Transaction.createdBy   (POS sales)
    Manager                          credited via Order.confirmedBy       (online orders)

Without this split a Manager would always show zero revenue despite handling every online
order, because managers do not operate the POS terminal. Employees with no activity in the
selected period fall back to zero rather than being omitted, so the roster stays complete.

Date presets

The four selector options map onto a shared buildDateFilter utility that converts a preset
name into a MongoDB range. Each preset normalises its boundaries to the start and end of
the day, so "This Month" runs from the first of the month at 00:00:00 to the last day at
23:59:59 regardless of when the query is issued.

    Preset          Range produced
    --------------------------------------------------------------------------------
    today           Midnight today to 23:59:59.999 today
    last-7-days     Midnight 7 days ago to end of today
    this-month      1st of month to last day of month, end of day
    custom          Supplied start to supplied end, boundaries normalised

Soft deletion and referential integrity

Deactivation sets isActive to false rather than deleting the record. Because
Transaction.createdBy and StockHistory.by reference the acting user, a hard delete would
orphan every record that employee touched and retrospectively break the performance report.
The soft flag blocks login while leaving the audit trail intact, and it is the same field
the inactive-staff alert reads — so deactivation and alerting share one source of truth
rather than drifting apart. The operation is reversible through the matching activate
endpoint.

The interface reinforces the boundary: the deactivate control is hidden for accounts whose
role is Manager, so the store owner cannot lock themselves out of their own store.


================================================================================
5.4.3.10  STORE SETTINGS AND BRANDING
================================================================================

Trigger
    Manager opens Settings and saves store information, appearance, or their own profile
    and password.

Frontend
    Three tabs — Store Info, Appearance, Account. Appearance offers nine preset colour
    swatches plus a custom hex picker, with a live preview strip showing a button, an
    outline button and a badge in the chosen colour before the manager commits. Logo upload
    accepts drag-and-drop and previews the file locally before it is sent.

Backend
    getSettings returns the store's own configuration document, joined with a read-only
    subscription plan looked up from the platform's tenant registry. updateSettings applies
    a whitelist patch under requireRole('Manager').

The operator / manager boundary

OneShop is sold as a subscription to independent shops. The platform operator provisions
each store and sets its subscription plan; from the moment the store is handed over, its
manager owns the day-to-day configuration and the operator does not alter it. That division
is visible directly in the read handler, which draws from two different databases:

    1. Store-owned configuration is read from this store's own database through a
       writable model the manager may update.

    2. The subscription plan is read from the platform's tenant registry database
       through a raw collection query with a projection limited to a single field.

The asymmetry is the point. There is no write path to the subscription plan anywhere in
this module. A manager can therefore see which plan their shop is on but cannot upgrade
themselves — that remains with the operator. The lookup is also wrapped so that a failure to
reach the registry falls back to a default plan rather than breaking the settings page.

Whitelist patching

updateSettings never passes the request body to the database. It copies approved fields
into a fresh object, which means an attacker who adds storeId or subscriptionPlan to the
payload changes nothing.

The colour handling is defensive in two stages: leading hash characters are stripped and
re-added so that both "155dfc" and "##155dfc" normalise to "#155dfc", and the result must
then match a strict six-digit hexadecimal pattern before it is accepted. A malformed value
is silently ignored rather than written, because an invalid colour would otherwise
propagate into every CSS variable in the application.

Note also the deliberate distinction in the field checks: a store name is only copied if it
is truthy, whereas address, phone and email are copied whenever they are defined. A store
name may not be blanked, but an address legitimately may.

Branding propagation

The saved colour is published through a React context and bound to the CSS custom property
--color-primary. Components reference the variable rather than a literal hex value, so one
save restyles the management dashboard, the POS terminal and the customer-facing storefront
with no rebuild and no per-component change. Currency and locale travel the same route,
which is why monetary amounts format identically across modules written by different team
members.

Logo uploads append a cache-busting query string of the form /uploads/logo/<file>?v=<timestamp>
so a replacement logo appears immediately instead of being served from the browser cache
under its previous filename.

Access control summary

    Route                       Guard                  Rationale
    --------------------------------------------------------------------------------
    GET   /api/settings         Tenant context only    Branding must load on the login
                                                       screen, before any user is
                                                       authenticated
    PATCH /api/settings         Authenticated+Manager  Only the store owner may
                                                       reconfigure the shop
    POST  /api/settings/logo    Authenticated+Manager  Same, plus multipart upload
                                                       handling
