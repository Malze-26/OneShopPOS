import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'OneShop POS',
  description: 'Inventory Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
