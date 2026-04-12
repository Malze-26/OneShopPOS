import { Eye, Plus, Download } from 'lucide-react';

const actions = [
  {
    label: 'View Products',
    icon: Eye,
    description: 'Browse all inventory items',
    variant: 'primary',
    color: 'indigo'
  },
  {
    label: 'Add Product',
    icon: Plus,
    description: 'Add new item to inventory',
    variant: 'secondary',
    color: 'emerald'
  },
  {
    label: 'Import Products',
    icon: Download,
    description: 'Bulk import from CSV/Excel',
    variant: 'outlined',
    color: 'gray'
  }
];

export function QuickActions() {
  return (
    <div className="mb-8">
      <h2 className="text-gray-900 text-xl mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => {
          const Icon = action.icon;
          
          const getButtonStyles = () => {
            if (action.variant === 'primary') {
              return 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg';
            } else if (action.variant === 'secondary') {
              return 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg';
            } else {
              return 'bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50';
            }
          };
          
          return (
            <button
              key={action.label}
              className={`flex items-center gap-4 p-6 rounded-2xl transition-all ${getButtonStyles()}`}
            >
              <div className={`
                p-3 rounded-xl
                ${action.variant === 'outlined' ? 'bg-gray-100' : 'bg-white/20'}
              `}>
                <Icon className={`w-6 h-6 ${action.variant === 'outlined' ? 'text-indigo-600' : 'text-white'}`} />
              </div>
              <div className="text-left">
                <div className={`text-lg ${action.variant === 'outlined' ? 'text-gray-900' : 'text-white'}`}>
                  {action.label}
                </div>
                <div className={`text-sm ${action.variant === 'outlined' ? 'text-gray-600' : 'text-white/80'}`}>
                  {action.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
