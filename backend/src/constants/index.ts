/**
 * Application-wide backend constants.
 * Import from here instead of scattering magic strings/numbers across controllers.
 */

// ── Category defaults ──────────────────────────────────────────────────────
export const DEFAULT_CATEGORY_ICON = '📦';
export const DEFAULT_CATEGORY_COLOR = '#155dfc';
export const DEFAULT_CATEGORY_NAME = 'Uncategorized';

// ── Product defaults ───────────────────────────────────────────────────────
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_COST_PRICE = 0;
export const DEFAULT_STOCK = 0;

// ── Pagination ─────────────────────────────────────────────────────────────
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 50;

// ── GRN ───────────────────────────────────────────────────────────────────
export const GRN_NUMBER_PAD_LENGTH = 4;

// ── Supplier returns ───────────────────────────────────────────────────────
export const RETURN_NUMBER_PAD_LENGTH = 4;
export const RETURN_REASONS = ['expired', 'damaged'] as const;

// ── Expiry tracking ────────────────────────────────────────────────────────
/** A product within this many days of its expiry date counts as "expiring soon". */
export const EXPIRY_SOON_DAYS = 30;

// ── Stock history ──────────────────────────────────────────────────────────
export const STOCK_HISTORY_RECENT_LIMIT = 20;

// ── Fallback actor label when no user is on the request ───────────────────
export const SYSTEM_ACTOR = 'System';
