import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProductListing } from '@/components/catalog/product-listing';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { type ListingPageData, loadListing } from '@/lib/listing-page';
import { parseListingParams, type SearchParams } from '@/lib/listing-params';

// Query, filters and pages live in the query string: rendered per request, never cached.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

/** `listing: null` — no query yet; `'unavailable'` — the search engine is down (API 503). */
async function resolve({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const query = await searchParams;
  const q = parseListingParams(query).q;
  if (!q) return { locale, q, listing: null };

  try {
    return { locale, q, listing: await loadListing(locale, query, {}) };
  } catch (error) {
    unstable_rethrow(error); // notFound() for pages past the end
    return { locale, q, listing: 'unavailable' as const };
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, q } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'searchPage' });
  // Internal search results are never indexed (thin, infinite URL space).
  return {
    title: q ? t('resultsTitle', { query: q }) : t('title'),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage(props: Props) {
  const data = await resolve(props);
  setRequestLocale(data.locale);
  return <SearchView q={data.q} listing={data.listing} />;
}

function SearchView({
  q,
  listing,
}: {
  q: string;
  listing: ListingPageData | 'unavailable' | null;
}) {
  const t = useTranslations('searchPage');

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: t('title') }]} />
      <h1 className="mt-4 text-3xl leading-tight font-bold break-words md:text-4xl">
        {q ? t('resultsTitle', { query: q }) : t('title')}
      </h1>

      {listing === null && <p className="mt-3 text-muted-foreground">{t('emptyQuery')}</p>}

      {listing === 'unavailable' && (
        <div
          role="status"
          className="mt-6 rounded-md border border-sand bg-secondary px-4 py-3 text-secondary-foreground"
        >
          {t('unavailable')}{' '}
          <Link href="/brands" className="font-medium text-primary hover:underline">
            {t('browseBrands')}
          </Link>
        </div>
      )}

      {listing && listing !== 'unavailable' && (
        <div className="mt-6 lg:mt-8">
          <ProductListing
            basePath="/search"
            state={listing.state}
            result={listing.result}
            emptyText={t('noResults', { query: q })}
          />
        </div>
      )}
    </div>
  );
}
