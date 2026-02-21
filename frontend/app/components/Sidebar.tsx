import { 
  LayoutDashboard, 
  Package, 
  AlertTriangle, 
  Download
} from 'lucide-react';

interface SidebarProps {
  activePage?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'Dashboard' },
  { icon: Package, label: 'Products', page: 'Products' },
  { icon: AlertTriangle, label: 'Low Stock', page: 'Low Stock' },
  { icon: Download, label: 'Import Products', page: 'Import Products' },
];

export function Sidebar({ activePage = 'Dashboard' }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center shadow-md">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-gray-900">OneShop</div>
            <div className="text-xs text-gray-500">Inventory System</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.page === activePage;
            
            return (
              <li key={item.label}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-700' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 p-4 rounded-xl">
          <h4 className="text-sm text-gray-900 mb-1">Need Help?</h4>
          <p className="text-xs text-gray-600 mb-3">Contact support for assistance</p>
          <button className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            Get Support
          </button>
        </div>
      </div>
    </aside>
  );
}
