export interface Transaction {
  _id: string;
  txnId: string;
  orderId: string;
  customer: string;
  paymentMethod: "Cash" | "Card" | "Bank Transfer";
  amount: number;
  status: "success" | "pending" | "failed" | "refunded" | "voided";
  createdAt: string;
}

export function getTodayStats(transactions: Transaction[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTxns = transactions.filter((t) => new Date(t.createdAt) >= today);
  const todaySales = todayTxns
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.amount, 0);

  const successCount = transactions.filter((t) => t.status === "success").length;
  const successRate = transactions.length
    ? Math.round((successCount / transactions.length) * 100)
    : 0;

  const avgBill = successCount
    ? Math.round(
        transactions
          .filter((t) => t.status === "success")
          .reduce((s, t) => s + t.amount, 0) / successCount
      )
    : 0;

  return { todaySales, todayCount: todayTxns.length, successRate, successCount, avgBill };
}