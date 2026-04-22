import { AuthProvider } from '@/app/contexts/AuthContext';

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
