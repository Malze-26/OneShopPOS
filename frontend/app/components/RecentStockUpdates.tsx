import { Plus, Minus, Package } from 'lucide-react';

interface StockUpdate {
  id: string;
  productName: string;
  action: 'Added' | 'Removed';
  quantity: number;
  date: string;
  time: string;
}

const mockUpdates: StockUpdate[] = [
  {
    id: '1',
    productName: 'Samsung Galaxy A54 5G',
    action: 'Added',
    quantity: 25,
    date: '2026-01-07',
    time: '10:24 AM'
  },
  {
    id: '2',
    productName: 'Dell Inspiron Laptop 15"',
    action: 'Added',
    quantity: 10,
    date: '2026-01-07',
    time: '09:45 AM'
  },
  {
    id: '3',
    productName: 'HP Wireless Mouse',
    action: 'Removed',
    quantity: 8,
    date: '2026-01-06',
    time: '04:15 PM'
  },
  {
    id: '4',
    productName: 'Sony WH-1000XM5 Headphones',
    action: 'Added',
    quantity: 15,
    date: '2026-01-06',
    time: '02:30 PM'
  },
  {
    id: '5',
    productName: 'Logitech Keyboard K380',
    action: 'Removed',
    quantity: 5,
    date: '2026-01-06',
    time: '11:20 AM'
  },
  {
    id: '6',
    productName: 'Apple AirPods Pro 2',
    action: 'Added',
    quantity: 20,
    date: '2026-01-05',
    time: '03:45 PM'
  },
  {
    id: '7',
    productName: 'JBL Flip 6 Speaker',
    action: 'Added',
    quantity: 12,
    date: '2026-01-05',
    time: '01:10 PM'
  },
  {
    id: '8',
    productName: 'Anker Power Bank 20000mAh',
    action: 'Removed',
    quantity: 3,
    date: '2026-01-05',
    time: '10:00 AM'
  }
];

export function RecentStockUpdates() {
  if (mockUpdates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 text-lg mb-2">No Recent Updates</h3>
          <p className="text-gray-600 text-sm">Stock updates will appear here once you start managing inventory</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-gray-900 text-xl">Recent Stock Updates</h2>
        <p className="text-gray-600 text-sm">Latest inventory movements and changes</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                Date & Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockUpdates.map((update) => {
              const isAdded = update.action === 'Added';
              
              return (
                <tr key={update.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className="text-gray-900">{update.productName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`
                        p-1.5 rounded-lg
                        ${isAdded ? 'bg-emerald-100' : 'bg-red-100'}
                      `}>
                        {isAdded ? (
                          <Plus className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        isAdded ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {update.action}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{update.quantity} units</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 text-sm">{update.date}</div>
                    <div className="text-gray-500 text-xs">{update.time}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button className="text-indigo-600 hover:text-indigo-700 text-sm transition-colors">
          View All Updates →
        </button>
      </div>
    </div>
  );
}
