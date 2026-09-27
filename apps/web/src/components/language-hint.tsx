'use client';

import { Button } from '@ml/ui/components/button';
import { X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';

const DISMISS_COOKIE = 'ml-lang-hint';

// Shown in the visitor's language, so texts can't come from the current page's messages.
const HINTS: Record<Locale, { text: string; action: string; close: string }> = {
  uk: { text: 'Ця сторінка є українською.', action: 'Перейти', close: 'Закрити' },
  ru: { text: 'Эта страница есть на русском.', action: 'Перейти', close: 'Закрыть' },
  en: { text: 'This page is available in English.', action: 'Switch', close: 'Close' },
};

/** First browser language we support, unless the visitor dismissed the hint before. */
function preferredLocale(): Locale | null {
  if (document.cookie.split('; ').includes(`${DISMISS_COOKIE}=1`)) return null;
  for (const tag of navigator.languages) {
    const lang = tag.slice(0, 2).toLowerCase();
    if ((routing.locales as readonly string[]).includes(lang)) return lang as Locale;
  }
  return null;
}

const noopSubscribe = () => () => {};

/**
 * Decision 1.4: the browser language only suggests another version; the URL decides
 * and nobody (bots included) is redirected. Client-only, so pages stay cacheable.
 */
export function LanguageHint() {
  const locale = useLocale();
  const pathname = usePathname();
  const preferred = useSyncExternalStore(noopSubscribe, preferredLocale, () => null);
  const [dismissed, setDismissed] = useState(false);

  if (!preferred || preferred === locale || dismissed) return null;
  const hint = HINTS[preferred];

  const dismiss = () => {
    document.cookie = `${DISMISS_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    setDismissed(true);
  };

  return (
    <div lang={preferred} className="border-b bg-muted text-sm">
      <div className="container-page flex items-center gap-3 py-2">
        <p className="flex-1">{hint.text}</p>
        <Button size="sm" asChild>
          <Link href={pathname} locale={preferred} onClick={dismiss}>
            {hint.action}
          </Link>
        </Button>
        <Button variant="ghost" size="icon" aria-label={hint.close} onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
