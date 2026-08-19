import { LucideIcon } from 'lucide-react';

/** One card in the top summary row. */
export interface StatCardData {
  title: string;
  value: string;
  change?: string;
  changeColor?: string;
  subtext: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  /** Optional link shown as "View Details →" at the bottom of the card. */
  linkTo?: string;
}

/** A single point on the sales trend line chart. */
export interface SalesTrendPoint {
  date: string;
  sales: number;
}

/** One entry in the payment-method pie chart. */
export interface PaymentEntry {
  name: string;
  /** Percentage of total (0–100). */
  value: number;
  /** Raw currency amount. */
  amount: number;
  color: string;
}

/** A row in the top-selling products table. */
export interface TopProduct {
  rank: number;
  id: string;
  name: string;
  /** Server-relative path to the product's first image, or null if it has none. */
  image: string | null;
  units: number;
  revenue: number;
}

/** A row in the employee performance list. */
export interface EmployeePerf {
  name: string;
  avatar: string;
  revenue: number;
  transactions: number;
  /** Performance score 0–100, used to size the background bar. */
  performance: number;
}

export type OrderStatus = 'completed' | 'pending' | 'refunded';

/** A row in the recent orders list. */
export interface RecentOrder {
  id: string;
  customer: string;
  amount: number;
  status: OrderStatus;
  time: string;
}
