import { LogOut, User } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg flex items-center justify-center shadow-md">
          <span className="text-white text-sm">RF</span>
        </div>
        <div>
          <div className="text-gray-900">OneShop</div>
          <div className="text-xs text-gray-500">Inventory Management</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center text-white">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-900 text-sm">Chamara Silva</div>
            <div className="text-gray-500 text-xs">Store Manager</div>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </header>
  );
}
