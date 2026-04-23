'use client';

import Link from 'next/link';
import { RecentOrder, OrderStatus } from './types';

interface RecentOrdersListProps {
  orders: RecentOrder[];
  currency: string;
}

/** Color tokens for each order status badge. */
const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string }> = {
  completed: { bg: '#ecfdf3', text: '#12b76a' },
  pending:   { bg: '#fffaeb', text: '#f79009' },
  refunded:  { bg: '#fef3f2', text: '#f04438' },
};

/**
 * Shows the five most recent orders with their ID, customer name, amount,
 * and a colour-coded status badge.
 *
 * TODO: Wire up a real API endpoint (e.g. GET /api/orders?limit=5&sort=newest)
 *       to replace the placeholder data.
 */
export function RecentOrdersList({ orders, currency }: RecentOrdersListProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-[#e4e7ec]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Recent Orders</h2>
          <p className="text-xs text-[#4a5565] mt-1">Latest transactions</p>
        </div>
        <Link
          href="/orders"
          className="text-sm text-[var(--color-primary)] hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const style = STATUS_STYLES[order.status];
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 p-2 hover:bg-[#f9fafb] rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#101828]">{order.id}</div>
                <div className="text-xs text-[#4a5565] truncate">{order.customer}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#101828] mb-1">
                  {currency} {order.amount.toLocaleString()}
                </div>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={{ backgroundColor: style?.bg, color: style?.text }}
                >
                  {order.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
