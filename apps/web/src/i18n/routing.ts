import { defineRouting } from 'next-intl/routing';

/**
 * Storefront locales and URL strategy (decision 1.4).
 * Order = priority (switcher, hreflang); matches `locales.position` in the DB.
 * `uk` has no prefix; `/ru/...`, `/en/...` are prefixed.
 */
export const routing = defineRouting({
  locales: ['uk', 'ru', 'en'],
  defaultLocale: 'uk',
  localePrefix: 'as-needed',
  // The URL is the only source of the locale: no Accept-Language/cookie redirects (SEO, bots).
  localeDetection: false,
  // No Set-Cookie on every response (keeps pages CDN-cacheable).
  localeCookie: false,
  // `Link` response headers with hreflang uk/ru/en + x-default (same slugs in every locale).
  alternateLinks: true,
});

export type Locale = (typeof routing.locales)[number];

/** Native language names for the switcher and the language hint. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uk: 'Українська',
  ru: 'Русский',
  en: 'English',
};
