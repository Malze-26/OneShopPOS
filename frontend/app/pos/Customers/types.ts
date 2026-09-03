import { formatStoreDate } from "@/app/lib/timezone";

// Customer type comes from the shared lib — do not redefine it here
export type { ICustomer as Customer } from "@/app/lib/types";

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
  return formatStoreDate(date, { day: "2-digit", month: "short", year: "numeric" });
}