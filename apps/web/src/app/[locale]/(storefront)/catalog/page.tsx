import type { CategoryNodeDto } from '@ml/api-client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getPathname, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getCategoryTree } from '@/lib/catalog';
import { categoryHref } from '@/lib/routes';

// Rendered per request until ISR lands in 8.9 (the category tree comes from the API).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: getPathname({ href: '/catalog', locale }) },
  };
}

/** Full category tree: roots → subcategories → their children. */
export default async function CatalogPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <CatalogView tree={await getCategoryTree(locale)} />;
}

function CatalogView({ tree }: { tree: CategoryNodeDto[] }) {
  const t = useTranslations('catalog');

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ name: t('title') }]} />
      <h1 className="mt-4 text-3xl leading-tight font-bold md:text-4xl">{t('title')}</h1>

      {tree.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{t('unavailable')}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-12">
          {tree.map((root) => (
            <section key={root.id} aria-labelledby={`catalog-${root.id}`}>
              <h2 id={`catalog-${root.id}`} className="mb-4 border-b pb-2 text-2xl font-bold">
                <Link href={categoryHref(root.path)} className="hover:text-primary">
                  {root.name}
                </Link>
              </h2>
              <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                {root.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={categoryHref(child.path)}
                      className="font-semibold hover:text-primary"
                    >
                      {child.name}
                    </Link>
                    {child.children.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {child.children.map((leaf) => (
                          <li key={leaf.id}>
                            <Link
                              href={categoryHref(leaf.path)}
                              className="text-muted-foreground hover:text-primary"
                            >
                              {leaf.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
