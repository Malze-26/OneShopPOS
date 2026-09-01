/**
 * Shared definitions of "what counts as low stock".
 *
 * Low stock is a request to reorder: the shelf is running down and needs
 * refilling. Stock that has passed its expiry date is a different problem — it
 * has to go back to the supplier, not be topped up — so counting it as low
 * stock puts it on a worklist that cannot resolve it, and inflates the figure
 * managers reorder against.
 *
 * The rule lives here so the dashboard card, the alerts page and the inventory
 * report cannot drift apart on what they mean by it.
 */
import { FilterQuery } from 'mongoose';
import { IProduct } from '../models/Product';

/**
 * Midnight this morning — the cut-off an expiry date must fall before to count
 * as expired, so stock expiring later today is still sellable today.
 */
export function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Matches products that are still sellable today: non-perishables, which carry
 * no expiry date at all, and perishables that have not passed theirs.
 */
export function notExpiredFilter(): FilterQuery<IProduct> {
  return {
    $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gte: startOfToday() } }],
  };
}

/**
 * Matches products that need reordering — some stock left, at or below their
 * threshold, and still sellable.
 */
export function lowStockFilter(): FilterQuery<IProduct> {
  return {
    $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] },
    ...notExpiredFilter(),
  };
}

/**
 * The same expiry test as an aggregation expression, for pipelines that label
 * or tally each product rather than filtering the collection.
 */
export function expiredExpr(asOf: Date = startOfToday()) {
  return {
    $and: [
      { $ne: [{ $ifNull: ['$expiryDate', null] }, null] },
      { $lt: ['$expiryDate', asOf] },
    ],
  };
}
