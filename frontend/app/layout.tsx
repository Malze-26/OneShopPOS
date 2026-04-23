import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { StoreProvider } from '@/app/contexts/StoreContext';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_STORE_NAME ?? 'OneShop POS',
  description: 'Inventory Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <StoreProvider>
          <AuthProvider>{children}</AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
