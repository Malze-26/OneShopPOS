import { Connection, Model } from 'mongoose';
import { IUser, userSchema } from '../models/User';
import { IProduct, productSchema } from '../models/Product';
import { ICategory, categorySchema } from '../models/Category';
import { ICustomer, customerSchema } from '../models/Customer';
import { ITransaction, transactionSchema } from '../models/Transaction';
import { IStockHistory, stockHistorySchema } from '../models/StockHistory';
import { IStoreSettings, storeSettingsSchema } from '../models/StoreSettings';
import { IOrder, orderSchema } from '../models/Order';
import { IPromo, promoSchema } from '../models/Promo';
import { ISupplier, supplierSchema } from '../models/Supplier';
import { IGRN, grnSchema } from '../models/GRN';

export interface TenantModels {
  User: Model<IUser>;
  Product: Model<IProduct>;
  Category: Model<ICategory>;
  Customer: Model<ICustomer>;
  Transaction: Model<ITransaction>;
  StockHistory: Model<IStockHistory>;
  StoreSettings: Model<IStoreSettings>;
  Order: Model<IOrder>;
  Promo: Model<IPromo>;
  Supplier: Model<ISupplier>;
  GRN: Model<IGRN>;
}

export function getModels(conn: Connection): TenantModels {
  return {
    User: conn.models['User'] ?? conn.model<IUser>('User', userSchema),
    Product: conn.models['Product'] ?? conn.model<IProduct>('Product', productSchema),
    Category: conn.models['Category'] ?? conn.model<ICategory>('Category', categorySchema),
    Customer: conn.models['Customer'] ?? conn.model<ICustomer>('Customer', customerSchema),
    Transaction: conn.models['Transaction'] ?? conn.model<ITransaction>('Transaction', transactionSchema),
    StockHistory: conn.models['StockHistory'] ?? conn.model<IStockHistory>('StockHistory', stockHistorySchema),
    StoreSettings: conn.models['StoreSettings'] ?? conn.model<IStoreSettings>('StoreSettings', storeSettingsSchema),
    Order: conn.models['Order'] ?? conn.model<IOrder>('Order', orderSchema),
    Promo: conn.models['Promo'] ?? conn.model<IPromo>('Promo', promoSchema),
    Supplier: conn.models['Supplier'] ?? conn.model<ISupplier>('Supplier', supplierSchema),
    GRN: conn.models['GRN'] ?? conn.model<IGRN>('GRN', grnSchema),
  };
}
