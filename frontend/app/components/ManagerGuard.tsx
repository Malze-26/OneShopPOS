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
    if (user.role !== 'Manager') router.replace('/pos/dashboard');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'Manager') return null;
  return <>{children}</>;
}
