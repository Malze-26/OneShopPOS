// ============================================================
// OneShop POS — Shared Frontend Types
// Mirrors backend models exactly. Both you and Sithmi import
// from this file. Never redefine these types in a page/component.
// ============================================================

// ------------------------------------------------------------
// Auth / Token
// ------------------------------------------------------------
export type UserRole = 'Manager' | 'Cashier';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  storeId: string;
}

// ------------------------------------------------------------
// User
// ------------------------------------------------------------
export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Customer
// ------------------------------------------------------------
export interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastPurchase?: string; // ISO date string from API
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

// Used when creating a new customer
export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// Used when updating an existing customer
export interface UpdateCustomerPayload {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// ------------------------------------------------------------
// Category
// ------------------------------------------------------------
export interface ICategory {
  _id: string;
  name: string;
  icon: string;
  color: string;
  /** Three capital letters every product SKU in this category starts with, e.g. SDW. */
  skuPrefix?: string;
  storeId: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Product
// ------------------------------------------------------------
export type ProductStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
export type ProductUnit = 'kg' | 'item';

export interface IProduct {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
  images: string[];
  /** Name of the supplier the stock was bought from, denormalised for listings. */
  supplier: string;
  /** Supplier ObjectId as string — every product has one. */
  supplierId: string;
  storeId: string;
  status: ProductStatus; // virtual field from backend
  createdBy: string;
  isWeightBased: boolean;
  unit: ProductUnit;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Stock History
// ------------------------------------------------------------
export type AdjustmentType = 'add' | 'remove';

export interface IStockHistory {
  _id: string;
  product: string; // Product ObjectId as string
  type: AdjustmentType;
  quantity: number;
  reason: string;
  by: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Promo
// ------------------------------------------------------------
export type DiscountType = 'percentage' | 'fixed';

export interface IPromo {
  _id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount: number;
  maxUses: number;      // 0 = unlimited
  usedCount: number;
  expiresAt: string;    // ISO date string from API
  isActive: boolean;
  storeId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Promo validate response
export interface PromoValidateResponse {
  valid: boolean;
  promo?: IPromo;
  message?: string;
}

// ------------------------------------------------------------
// Transaction
// ------------------------------------------------------------
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer';
export type TransactionStatus = 'success' | 'pending' | 'failed' | 'refunded' | 'voided';

export interface ITransaction {
  _id: string;
  txnId: string;
  orderId: string;
  customer: string;           // display name (string)
  customerId?: string;        // linked Customer ObjectId (optional)
  paymentMethod: PaymentMethod;
  amount: number;
  status: TransactionStatus;
  storeId: string;
  createdBy: string;          // User ObjectId as string
  createdAt: string;
  updatedAt: string;
}

// Used when creating a transaction from the POS
export interface CreateTransactionPayload {
  orderId: string;
  customer: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status?: TransactionStatus;
}

// ------------------------------------------------------------
// API Response wrapper (generic)
// Used by both your hooks and Sithmi's hooks for consistency
// ------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}