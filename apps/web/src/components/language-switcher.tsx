'use client';

import { Button } from '@ml/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ml/ui/components/dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_NAMES, type Locale, routing } from '@/i18n/routing';

/**
 * Switches to the same page in another locale (slugs are shared, decision 1.4).
 * Query string (filters, search) is kept. Crawlers find the versions via hreflang.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: string) =>
    startTransition(() =>
      router.replace(`${pathname}${window.location.search}`, { locale: next as Locale }),
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t('label')}: ${LOCALE_NAMES[locale]}`}
          disabled={pending}
          className="text-xs font-bold tracking-[0.05em] uppercase"
        >
          {locale}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={switchTo}>
          {routing.locales.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} lang={value}>
              {LOCALE_NAMES[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
