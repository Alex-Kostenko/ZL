import type { BrandListItemDto } from '@ml/api-client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getPathname, Link } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { groupByLetter } from '@/lib/brands';
import { getBrands } from '@/lib/catalog';
import { brandHref } from '@/lib/routes';

// Rendered per request until ISR lands in 8.9: the API is not reachable at build time.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

async function resolveLocale({ params }: Props): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = await resolveLocale(props);
  const [t, brands] = await Promise.all([
    getTranslations({ locale, namespace: 'brands' }),
    getBrands(locale),
  ]);
  return {
    title: t('metaTitle'),
    description: t('metaDescription', { count: brands.length }),
    alternates: { canonical: getPathname({ href: '/brands', locale }) },
  };
}

export default async function BrandsPage(props: Props) {
  const locale = await resolveLocale(props);
  setRequestLocale(locale);
  const brands = await getBrands(locale);
  return <BrandsView brands={brands} locale={locale} />;
}

function BrandsView({ brands, locale }: { brands: BrandListItemDto[]; locale: Locale }) {
  const t = useTranslations('brands');
  const groups = groupByLetter(brands, locale);

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: t('title') }]} />
      <h1 className="mt-4 text-3xl leading-tight font-bold md:text-4xl">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('lead', { count: brands.length })}</p>

      {groups.length > 0 && (
        <nav aria-label={t('index')} className="mt-6 rounded-md border bg-card px-2 py-2">
          <ul className="flex flex-wrap gap-1">
            {groups.map((group) => (
              <li key={group.anchor}>
                <a
                  href={`#${group.anchor}`}
                  className="flex h-8 min-w-8 items-center justify-center rounded-sm px-1.5 text-sm font-semibold hover:bg-accent hover:text-primary"
                >
                  {group.letter}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8 flex flex-col gap-10">
        {groups.map((group) => (
          <section
            key={group.anchor}
            id={group.anchor}
            aria-labelledby={`${group.anchor}-h`}
            className="scroll-mt-4 lg:scroll-mt-32"
          >
            <h2 id={`${group.anchor}-h`} className="mb-3 border-b pb-2 text-2xl font-bold">
              {group.letter}
            </h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {group.items.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={brandHref(brand.slug)}
                    className="flex items-baseline justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-primary"
                  >
                    <span className="truncate">{brand.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {brand.productCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
