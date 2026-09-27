import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Мисливська лавка',
  description: 'Товари для полювання, риболовлі та активного відпочинку',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
