import { Package, DollarSign, AlertTriangle, Clock } from 'lucide-react';

const cards = [
  {
    title: 'Total Products',
    value: '1,847',
    icon: Package,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    detail: '156 categories'
  },
  {
    title: 'Total Stock Value',
    value: 'Rs 4,285,590',
    icon: DollarSign,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    detail: 'Current valuation'
  },
  {
    title: 'Low Stock Items',
    value: '34',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    detail: 'Requires attention',
    isWarning: true
  },
  {
    title: 'Recent Updates',
    value: '127',
    icon: Clock,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    detail: 'Last 7 days'
  }
];

export function SummaryCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.title} 
            className={`bg-white rounded-2xl p-6 border ${card.borderColor} shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.iconBg} p-3 rounded-xl shadow-sm`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              {card.isWarning && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Alert
                </span>
              )}
            </div>
            <h3 className="text-gray-600 text-sm mb-2">{card.title}</h3>
            <div className="text-gray-900 text-3xl mb-2">{card.value}</div>
            <p className="text-gray-500 text-xs">{card.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
