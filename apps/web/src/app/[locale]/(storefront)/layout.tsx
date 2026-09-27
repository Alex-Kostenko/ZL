import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { type ReactNode, use } from 'react';
import { LanguageHint } from '@/components/language-hint';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import type { Locale } from '@/i18n/routing';

// Storefront shell; the admin panel gets its own layout (9.6).
export default function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts render in parallel: set the locale here too, or next-intl falls back to reading request
  // headers in the header/footer, which makes every page dynamic (breaks ISR). Validated by the
  // root layout.
  setRequestLocale(use(params).locale as Locale);
  const t = useTranslations('layout');

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('skipToContent')}
      </a>
      <LanguageHint />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
