import type { BrandListItemDto, CategoryNodeDto, ProductListItemDto } from '@ml/api-client';
import { Button } from '@ml/ui/components/button';
import { ArrowRight, BadgeCheck, Boxes, ShieldCheck, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProductRail } from '@/components/catalog/product-rail';
import { getPathname, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { socialMetadata } from '@/lib/seo';
import { getBrands, getCategoryTree, getProductRail } from '@/lib/catalog';
import { brandHref, categoryHref } from '@/lib/routes';

// ISR: product rails show prices and stock, so the page is refreshed every minute.
// TODO(13.2): sections, banners and texts from the CMS.
export const revalidate = 60;

const CHILDREN_PER_CATEGORY = 6;
const TOP_BRANDS = 18;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'home' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  return {
    title,
    description,
    alternates: { canonical: getPathname({ href: '/', locale }) },
    ...(await socialMetadata({ locale, href: '/', title, description })),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [tree, brands, sale, newest] = await Promise.all([
    getCategoryTree(locale),
    getBrands(locale).catch((): BrandListItemDto[] => []),
    getProductRail(locale, { sale: true }),
    getProductRail(locale, { sort: 'newest' }),
  ]);
  const topBrands = [...brands]
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, TOP_BRANDS);

  return <HomeView tree={tree} brands={topBrands} sale={sale} newest={newest} />;
}

function HomeView({
  tree,
  brands,
  sale,
  newest,
}: {
  tree: CategoryNodeDto[];
  brands: BrandListItemDto[];
  sale: ProductListItemDto[];
  newest: ProductListItemDto[];
}) {
  const t = useTranslations('home');

  return (
    <>
      <section className="bg-hero text-white">
        <div className="container-page section">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-bold text-white md:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-sand">{t('lead')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-white text-ink hover:bg-sand">
              <Link href="/catalog">{t('toCatalog')}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/40 dark:bg-transparent dark:hover:bg-white/10"
            >
              <Link href="/sale">{t('toSale')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container-page flex flex-col gap-16 py-12 md:gap-20 md:py-16">
        {tree.length > 0 && (
          <section aria-labelledby="home-catalog">
            <h2 id="home-catalog" className="mb-5 text-2xl font-bold">
              {t('catalog')}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {tree.map((root) => (
                <li key={root.id} className="flex flex-col rounded-md border bg-card p-5">
                  <Link
                    href={categoryHref(root.path)}
                    className="font-serif text-xl font-bold text-heading hover:text-primary"
                  >
                    {root.name}
                  </Link>
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                    {root.children.slice(0, CHILDREN_PER_CATEGORY).map((child) => (
                      <li key={child.id}>
                        <Link
                          href={categoryHref(child.path)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={categoryHref(root.path)}
                    className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary hover:underline"
                  >
                    {t('allIn', { name: root.name })}
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label={t('showcases')} className="grid gap-4 md:grid-cols-2">
          <Link
            href="/sale"
            className="group rounded-md bg-terracotta p-6 text-white transition-opacity hover:opacity-95 md:p-8"
          >
            <p className="font-serif text-2xl font-bold">{t('saleTitle')}</p>
            <p className="mt-2 max-w-sm text-white/85">{t('saleText')}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold tracking-[0.05em] uppercase">
              {t('saleCta')}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
          <Link
            href="/antidron"
            className="group rounded-md bg-ink p-6 text-paper transition-opacity hover:opacity-95 md:p-8"
          >
            <p className="font-serif text-2xl font-bold">{t('antidronTitle')}</p>
            <p className="mt-2 max-w-sm text-sand">{t('antidronText')}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold tracking-[0.05em] uppercase">
              {t('antidronCta')}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </section>

        <ProductRail
          title={t('saleRail')}
          products={sale}
          more={{ href: '/sale', label: t('seeAll') }}
        />
        <ProductRail title={t('newRail')} products={newest} />

        {brands.length > 0 && (
          <section aria-labelledby="home-brands">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="home-brands" className="text-2xl font-bold">
                {t('brandsTitle')}
              </h2>
              <Link
                href="/brands"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t('allBrands')}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={brandHref(brand.slug)}
                    className="flex h-16 items-center justify-center rounded-md border bg-card px-3 text-center text-sm font-semibold hover:border-primary hover:text-primary"
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="home-why">
          <h2 id="home-why" className="mb-5 text-2xl font-bold">
            {t('whyTitle')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [Boxes, 'range'],
                [BadgeCheck, 'brands'],
                [ShieldCheck, 'expertise'],
                [Truck, 'delivery'],
              ] as const
            ).map(([Icon, key]) => (
              <li key={key} className="rounded-md border bg-card p-5">
                <Icon aria-hidden className="size-6 text-primary" />
                <p className="mt-3 font-semibold">{t(`why.${key}.title`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`why.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="home-about" className="max-w-3xl">
          <h2 id="home-about" className="text-2xl font-bold">
            {t('aboutTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('aboutText')}</p>
          <Link
            href="/about"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('aboutMore')}
          </Link>
        </section>
      </div>
    </>
  );
}
