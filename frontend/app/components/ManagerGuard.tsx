'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    
    // ONLY redirect to POS if we are SURE the user is a POS user
    if (user.role === 'Cashier' || user.role === 'Sales Representative') {
      router.replace('/pos/dashboard');
    }
  }, [user, loading, router]);


  if (loading || !user || (user.role !== 'Manager' && (user.role as string) !== 'superadmin')) return null;
  return <>{children}</>;
}
