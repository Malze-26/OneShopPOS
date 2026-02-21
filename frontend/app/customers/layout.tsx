import { AuthProvider } from '@/app/contexts/AuthContext';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { TopHeader } from '@/app/components/layout/TopHeader';

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-[#f9fafb]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
