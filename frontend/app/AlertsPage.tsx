import { AlertTriangle, Package, TrendingDown, UserX, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

const lowStockAlerts = [
  { id: 1, product: 'Product 006', sku: 'SKU-006', current: 5, threshold: 20, category: 'Electronics' },
  { id: 2, product: 'Product 007', sku: 'SKU-007', current: 12, threshold: 30, category: 'Clothing' },
  { id: 3, product: 'Product 008', sku: 'SKU-008', current: 8, threshold: 25, category: 'Food & Beverage' },
  { id: 4, product: 'Product 009', sku: 'SKU-009', current: 3, threshold: 15, category: 'Home & Garden' },
  { id: 5, product: 'Product 010', sku: 'SKU-010', current: 14, threshold: 40, category: 'Beauty' },
  { id: 6, product: 'Product 011', sku: 'SKU-011', current: 7, threshold: 20, category: 'Sports' },
];

const noSalesAlerts = [
  { id: 1, product: 'Product 015', sku: 'SKU-015', lastSale: '2026-02-12', daysAgo: 8 },
  { id: 2, product: 'Product 023', sku: 'SKU-023', lastSale: '2026-02-10', daysAgo: 10 },
  { id: 3, product: 'Product 031', sku: 'SKU-031', lastSale: '2026-02-08', daysAgo: 12 },
  { id: 4, product: 'Product 042', sku: 'SKU-042', lastSale: '2026-02-05', daysAgo: 15 },
];

const inactiveCashierAlerts = [
  { id: 1, name: 'Dilani Rajapaksa', lastLogin: '2026-02-13', daysInactive: 7 },
  { id: 2, name: 'Ravi Jayawardena', lastLogin: '2026-02-12', daysInactive: 8 },
];

const highRefundAlerts = [
  { id: 1, refundId: 'REF-006', orderId: 'ORD-038', customer: 'Customer 038', amount: 19800, reason: 'Duplicate order' },
  { id: 2, refundId: 'REF-002', orderId: 'ORD-012', customer: 'Customer 012', amount: 15300, reason: 'Wrong item delivered' },
  { id: 3, refundId: 'REF-004', orderId: 'ORD-025', customer: 'Customer 025', amount: 12400, reason: 'Product damaged' },
  { id: 4, refundId: 'REF-003', orderId: 'ORD-018', customer: 'Customer 018', amount: 8900, reason: 'Customer changed mind' },
];

export function AlertsPage() {
  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Alerts</h1>
        <p className="text-sm text-[#4a5565]">Monitor important notifications and warnings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec]">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#f04438]" />
            <p className="text-xs text-[#4a5565] font-semibold">Low Stock</p>
          </div>
          <h3 className="text-2xl font-bold text-[#f04438]">{lowStockAlerts.length}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec]">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-[#f79009]" />
            <p className="text-xs text-[#4a5565] font-semibold">No Sales</p>
          </div>
          <h3 className="text-2xl font-bold text-[#f79009]">{noSalesAlerts.length}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec]">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-4 h-4 text-[#f79009]" />
            <p className="text-xs text-[#4a5565] font-semibold">Inactive Cashiers</p>
          </div>
          <h3 className="text-2xl font-bold text-[#f79009]">{inactiveCashierAlerts.length}</h3>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec]">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#f04438]" />
            <p className="text-xs text-[#4a5565] font-semibold">High Refunds</p>
          </div>
          <h3 className="text-2xl font-bold text-[#f04438]">{highRefundAlerts.length}</h3>
        </div>
      </div>

      {/* Alert Sections */}
      <div className="space-y-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec] overflow-hidden">
          <div className="px-5 py-4 bg-[#fef3f2] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#f04438]" />
              <h2 className="text-base font-semibold text-[#101828]">Low Stock Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f04438] text-white text-xs font-medium rounded-full">
                {lowStockAlerts.length}
              </span>
            </div>
            <Link to="/stock/low-stock" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {lowStockAlerts.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#fffaeb] border border-[#f79009]/20 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-[#f79009]" />
                    <div className="text-sm font-medium text-[#101828]">{item.product}</div>
                    <span className="text-xs text-[#4a5565]">({item.sku})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#4a5565]">
                      Current: <span className="font-semibold text-[#f04438]">{item.current}</span>
                    </span>
                    <span className="text-[#4a5565]">
                      Threshold: <span className="font-semibold text-[#101828]">{item.threshold}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-[#f9fafb] text-[#4a5565] rounded text-xs">
                      {item.category}
                    </span>
                  </div>
                </div>
                <button className="ml-4 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                  Adjust Stock
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* No Sales Alert */}
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec] overflow-hidden">
          <div className="px-5 py-4 bg-[#fffaeb] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#f79009]" />
              <h2 className="text-base font-semibold text-[#101828]">No Sales Alert</h2>
              <span className="px-2 py-0.5 bg-[#f79009] text-white text-xs font-medium rounded-full">
                {noSalesAlerts.length}
              </span>
            </div>
            <Link to="/products" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All Products
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {noSalesAlerts.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-between hover:border-[#f79009]/20 transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#101828] mb-1">{item.product}</div>
                  <div className="flex items-center gap-3 text-xs text-[#4a5565]">
                    <span>SKU: {item.sku}</span>
                    <span>Last Sale: {item.lastSale}</span>
                    <span className="text-[#f79009] font-medium">{item.daysAgo} days ago</span>
                  </div>
                </div>
                <Link
                  to={`/products/${item.id}`}
                  className="ml-4 flex items-center gap-1 text-[#155dfc] hover:underline text-sm font-medium"
                >
                  View Product
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive Cashier Alerts */}
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f79009] border border-[#e4e7ec] overflow-hidden">
          <div className="px-5 py-4 bg-[#fffaeb] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-[#f79009]" />
              <h2 className="text-base font-semibold text-[#101828]">Inactive Cashier Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f79009] text-white text-xs font-medium rounded-full">
                {inactiveCashierAlerts.length}
              </span>
            </div>
            <Link to="/employees" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All Employees
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {inactiveCashierAlerts.map((cashier) => (
              <div
                key={cashier.id}
                className="p-4 bg-[#f9fafb] border border-[#e4e7ec] rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-[#f79009] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {cashier.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#101828]">{cashier.name}</div>
                    <div className="text-xs text-[#4a5565]">
                      Last login: {cashier.lastLogin} ({cashier.daysInactive} days inactive)
                    </div>
                  </div>
                </div>
                <Link
                  to="/employees"
                  className="ml-4 flex items-center gap-1 text-[#155dfc] hover:underline text-sm font-medium"
                >
                  View Employee
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* High Refund Alerts */}
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-[#f04438] border border-[#e4e7ec] overflow-hidden">
          <div className="px-5 py-4 bg-[#fef3f2] border-b border-[#e4e7ec] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#f04438]" />
              <h2 className="text-base font-semibold text-[#101828]">High Refund Alerts</h2>
              <span className="px-2 py-0.5 bg-[#f04438] text-white text-xs font-medium rounded-full">
                {highRefundAlerts.length}
              </span>
            </div>
            <Link to="/refunds" className="text-sm text-[#155dfc] hover:underline font-medium">
              View All Refunds
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {highRefundAlerts.map((refund) => (
              <div
                key={refund.id}
                className="p-4 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-medium text-[#155dfc]">{refund.refundId}</div>
                    <span className="text-xs text-[#4a5565]">({refund.orderId})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#4a5565]">Customer: {refund.customer}</span>
                    <span className="font-semibold text-[#f04438]">LKR {refund.amount.toLocaleString()}</span>
                    <span className="text-[#4a5565]">{refund.reason}</span>
                  </div>
                </div>
                <Link
                  to="/refunds"
                  className="ml-4 px-4 py-2 border-2 border-[#f04438] text-[#f04438] hover:bg-[#fef3f2] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Review Refund
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
