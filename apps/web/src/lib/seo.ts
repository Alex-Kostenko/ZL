import { loadWebEnv } from '@ml/config';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';

// Server-only (reads env): absolute URLs and OpenGraph/Twitter metadata shared by every page.

/** `og:locale` per site locale (the store sells in Ukraine). */
const OG_LOCALES: Record<Locale, string> = { uk: 'uk_UA', ru: 'ru_UA', en: 'en_US' };

/** Absolute URL of a locale-free path in `locale`, e.g. `/brands` → `https://…/ru/brands`. */
export function absoluteUrl(href: string, locale: Locale): string {
  return new URL(getPathname({ href, locale }), loadWebEnv().WEB_URL).href;
}

export interface SocialImage {
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string;
}

/**
 * `openGraph` + `twitter` for a page. Next.js replaces (does not merge) these objects per page,
 * so every page builds the full set here: site name, locale and alternates, URL, title, image.
 */
export async function socialMetadata({
  locale,
  href,
  title,
  description,
  images = [],
}: {
  locale: Locale;
  /** Locale-free canonical path of the page. */
  href: string;
  title: string;
  description?: string;
  images?: SocialImage[];
}): Promise<Pick<Metadata, 'openGraph' | 'twitter'>> {
  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const ogImages = images.map((image) => ({
    url: image.url,
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
    ...(image.alt ? { alt: image.alt } : {}),
  }));

  return {
    openGraph: {
      type: 'website',
      siteName: tMeta('siteName'),
      locale: OG_LOCALES[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
      url: absoluteUrl(href, locale),
      title,
      ...(description ? { description } : {}),
      ...(ogImages.length > 0 ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImages.length > 0 ? 'summary_large_image' : 'summary',
      title,
      ...(description ? { description } : {}),
      ...(ogImages.length > 0 ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}
