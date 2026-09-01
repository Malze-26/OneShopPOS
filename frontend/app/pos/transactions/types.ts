export interface TransactionItem {
  product?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  _id: string;
  txnId: string;
  orderId: string;
  customer: string;
  customerId?: string;
  paymentMethod: "Cash" | "Card" | string;
  amount: number;
  subtotal?: number;
  discount?: number;
  total?: number;
  items?: TransactionItem[];
  status: "success" | "voided" | "pending" | "failed" | string;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt: string;
}

export function getTodayStats(transactions: Transaction[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTxns = transactions.filter((t) => new Date(t.createdAt) >= today);
  const todaySales = todayTxns
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + (t.total ?? t.amount ?? 0), 0);

  const successCount = transactions.filter((t) => t.status === "success").length;
  const successRate = transactions.length
    ? Math.round((successCount / transactions.length) * 100)
    : 0;

  const avgBill = successCount
    ? Math.round(
        transactions
          .filter((t) => t.status === "success")
          .reduce((s, t) => s + (t.total ?? t.amount ?? 0), 0) / successCount
      )
    : 0;

  return { todaySales, todayCount: todayTxns.length, successRate, successCount, avgBill };
}