import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProductListing } from '@/components/catalog/product-listing';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getCategory } from '@/lib/catalog';
import { loadListing, listingMetadata } from '@/lib/listing-page';
import type { SearchParams } from '@/lib/listing-params';
import { categoryHref } from '@/lib/routes';

type Props = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<SearchParams>;
};

async function resolve({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const path = slug.map((s) => decodeURIComponent(s)).join('/');
  const [category, listing] = await Promise.all([
    getCategory(locale, path),
    loadListing(locale, await searchParams, { category: path }),
  ]);
  if (!category) notFound();
  return { locale, category, ...listing };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, category, result, state } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'category' });
  return listingMetadata({
    locale,
    basePath: categoryHref(category.path),
    state,
    title: t('metaTitle', { name: category.name }),
    description: t('metaDescription', { name: category.name, count: result.total }),
  });
}

export default async function CategoryPage(props: Props) {
  const data = await resolve(props);
  setRequestLocale(data.locale);
  return <CategoryView {...data} />;
}

function CategoryView({ category, result, state }: Awaited<ReturnType<typeof resolve>>) {
  const t = useTranslations('category');
  const crumbs = category.breadcrumbs.map((crumb, index, all) => ({
    name: crumb.name,
    href: index < all.length - 1 ? categoryHref(crumb.path) : undefined,
  }));

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl leading-tight font-bold md:text-4xl">{category.name}</h1>

      {category.children.length > 0 && (
        <nav aria-label={t('subcategories')} className="mt-5">
          <ul className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={categoryHref(child.path)}
                  className="inline-block rounded-sm border bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-6 lg:mt-8">
        <ProductListing basePath={categoryHref(category.path)} state={state} result={result} />
      </div>

      {category.description && state.page === 1 && (
        <section className="mt-14 max-w-3xl border-t pt-8 whitespace-pre-line text-muted-foreground">
          {category.description}
        </section>
      )}
    </div>
  );
}
