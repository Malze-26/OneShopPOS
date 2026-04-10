export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase?: string;
  storeId: string;
  createdAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  avgSpend: number;
  newThisMonth: number;
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function formatDate(date?: string) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}