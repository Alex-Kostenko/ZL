import type { Metadata } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

// Self-hosted at build time by next/font; CSS variables are consumed by @ml/ui tokens.
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' });
const merriweather = Merriweather({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-merriweather',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Мисливська лавка',
  description: 'Товари для полювання, риболовлі та активного відпочинку',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
