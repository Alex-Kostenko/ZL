import type { SearchResultDto } from '@ml/api-client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { searchListing } from '@/lib/catalog';
import {
  type ListingScope,
  type ListingState,
  listingSeo,
  MAX_PAGE,
  parseListingParams,
  pruneUnknownAttrs,
  type SearchParams,
  toSearchQuery,
} from '@/lib/listing-params';

// Server-only: data loading and metadata shared by every listing page (category, brand, showcases,
// search).

export interface ListingPageData {
  state: ListingState;
  result: SearchResultDto;
}

/**
 * Products + facets for a listing URL within a fixed scope. 404 for an unknown scope and for pages
 * past the end. Deduplicated per request (the search call is cached by its query), so
 * `generateMetadata` and the page can both call it.
 */
export async function loadListing(
  locale: Locale,
  searchParams: SearchParams,
  scope: ListingScope,
): Promise<ListingPageData> {
  const requested = parseListingParams(searchParams);
  if (requested.page > MAX_PAGE) notFound();

  const result = await searchListing(toSearchQuery(requested, scope, locale));
  if (!result) notFound();
  if (requested.page > 1 && result.items.length === 0) notFound();

  // Unknown attribute codes (old links, typos) are ignored by the API: drop them from the state too.
  const state = pruneUnknownAttrs(
    requested,
    result.facets.attributes.map((a) => a.code),
  );
  return { state, result };
}

/**
 * Title (with the page number), description, canonical and robots of a listing page (§67.13):
 * filtered views are `noindex, follow`, pagination is self-canonical.
 */
export async function listingMetadata({
  locale,
  basePath,
  state,
  title,
  description,
  noindex = false,
}: {
  locale: Locale;
  /** Locale-free path, e.g. `/brand/beretta`. */
  basePath: string;
  state: ListingState;
  title: string;
  description: string;
  /** The page itself is excluded from the index (e.g. a brand hidden by SEO settings). */
  noindex?: boolean;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'listing' });
  const seo = listingSeo(state);
  return {
    title: state.page > 1 ? `${title} — ${t('pageSuffix', { page: state.page })}` : title,
    description,
    alternates: { canonical: getPathname({ href: basePath, locale }) + seo.canonicalQuery },
    robots: seo.indexable && !noindex ? undefined : { index: false, follow: true },
  };
}
