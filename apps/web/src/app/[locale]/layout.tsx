import type { Metadata, Viewport } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import { notFound } from 'next/navigation';
import { loadWebEnv } from '@ml/config';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Self-hosted at build time by next/font; CSS variables are consumed by @ml/ui tokens.
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' });
const merriweather = Merriweather({
  subsets: ['latin', 'cyrillic'],
  // Headings only, all bold (brand.md): one weight keeps the LCP heading's font small.
  weight: '700',
  variable: '--font-merriweather',
  display: 'swap',
});

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

/**
 * No pages are prerendered at build time: the build (CI, Docker) has no API, so a build-time render
 * would bake empty menus and listings into static HTML. Every page is rendered on its first visit
 * and then served from the ISR cache for its `revalidate` period (§44, decision 8.9).
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    // Resolves relative canonical/alternate/OG URLs of every page to absolute ones.
    metadataBase: new URL(loadWebEnv().WEB_URL),
    title: t('siteName'),
    description: t('description'),
  };
}

// Browser UI color follows the OS scheme (matches --background of each theme).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f3ee' },
    { media: '(prefers-color-scheme: dark)', color: '#141716' },
  ],
};

// Root layout of the storefront; the admin panel (/admin) gets its own root layout (9.6).
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html> before hydration.
    <html
      lang={locale}
      className={`${inter.variable} ${merriweather.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>
          <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
