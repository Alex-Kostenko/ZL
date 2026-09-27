import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { hasLocale, useLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProductListing } from '@/components/catalog/product-listing';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getBrand } from '@/lib/catalog';
import { listingMetadata, loadListing } from '@/lib/listing-page';
import type { SearchParams } from '@/lib/listing-params';
import { brandHref } from '@/lib/routes';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParams>;
};

async function resolve({ params, searchParams }: Props) {
  const { locale, slug: rawSlug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const slug = decodeURIComponent(rawSlug);

  const [brand, listing] = await Promise.all([
    getBrand(locale, slug),
    loadListing(locale, await searchParams, { brand: [slug] }),
  ]);
  if (!brand) notFound();
  if (brand.slug !== slug) {
    permanentRedirect(getPathname({ href: brandHref(brand.slug), locale }));
  }
  return { locale, brand, ...listing };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, brand, result, state } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'brand' });
  return listingMetadata({
    locale,
    basePath: brandHref(brand.slug),
    state,
    title: brand.seo.title ?? t('metaTitle', { name: brand.name }),
    description:
      brand.seo.description ?? t('metaDescription', { name: brand.name, count: result.total }),
    noindex: brand.seo.noindex,
  });
}

export default async function BrandPage(props: Props) {
  const data = await resolve(props);
  setRequestLocale(data.locale);
  return <BrandView {...data} />;
}

function BrandView({ brand, result, state }: Awaited<ReturnType<typeof resolve>>) {
  const t = useTranslations('brand');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const country = brand.country
    ? new Intl.DisplayNames([locale], { type: 'region' }).of(brand.country)
    : null;

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: tNav('brands'), href: '/brands' }, { name: brand.name }]} />

      <header className="mt-4 flex flex-wrap items-center gap-5">
        {brand.logo && (
          <div className="relative h-16 w-32 shrink-0 overflow-hidden rounded-sm border bg-white p-2">
            <Image
              src={brand.logo.url}
              alt={brand.name}
              fill
              sizes="128px"
              className="object-contain p-2"
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl leading-tight font-bold md:text-4xl">{brand.name}</h1>
          {(country || brand.website) && (
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {country && <span>{t('country', { country })}</span>}
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  {t('website')}
                </a>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="mt-6 lg:mt-8">
        <ProductListing
          basePath={brandHref(brand.slug)}
          state={state}
          result={result}
          hidden={{ brand: true }}
          emptyText={t('empty')}
        />
      </div>

      {brand.description && state.page === 1 && (
        <section className="mt-14 max-w-3xl border-t pt-8 whitespace-pre-line text-muted-foreground">
          {brand.description}
        </section>
      )}
    </div>
  );
}
