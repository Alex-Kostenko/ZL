import type { ProductAttributeDto, ProductDetailDto, ProductListItemDto } from '@ml/api-client';
import { Badge } from '@ml/ui/components/badge';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { hasLocale, useLocale, useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { ProductRail } from '@/components/catalog/product-rail';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductPurchase } from '@/components/product/product-purchase';
import { VariantProvider } from '@/components/product/variant-context';
import { getPathname, Link } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { getProduct, getRelatedProducts } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';
import { brandHref, categoryHref, productHref } from '@/lib/routes';
import { absoluteUrl, socialMetadata } from '@/lib/seo';
import { productLd } from '@/lib/structured-data';

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Photos offered to social previews (the first one is used by most networks). */
const OG_IMAGES = 4;

async function resolve({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const slug = decodeURIComponent(rawSlug);

  const product = await getProduct(locale, slug);
  if (!product) notFound();
  // One URL per product: any other spelling the API resolves goes to the canonical slug.
  if (product.slug !== slug) {
    permanentRedirect(getPathname({ href: productHref(product.slug), locale }));
  }
  return { locale, product };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, product } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'product' });
  const price = product.price && formatPrice(product.price.amount, locale, product.price.currency);
  const description =
    product.shortDescription ??
    (price
      ? t('metaDescriptionPrice', { title: product.title, price })
      : t('metaDescription', { title: product.title }));
  const href = productHref(product.slug);

  return {
    title: t('metaTitle', { title: product.title }),
    description,
    alternates: { canonical: getPathname({ href, locale }) },
    ...(await socialMetadata({
      locale,
      href,
      title: product.title,
      description,
      images: product.images.slice(0, OG_IMAGES),
    })),
  };
}

export default async function ProductPage(props: Props) {
  const { locale, product } = await resolve(props);
  setRequestLocale(locale);
  const related = await getRelatedProducts(locale, product);
  return <ProductView product={product} related={related} />;
}

function ProductView({
  product,
  related,
}: {
  product: ProductDetailDto;
  related: ProductListItemDto[];
}) {
  const t = useTranslations('product');
  const tListing = useTranslations('listing');
  const tMeta = useTranslations('meta');
  const locale = useLocale() as Locale;
  const crumbs = [
    ...product.breadcrumbs.map((crumb) => ({ name: crumb.name, href: categoryHref(crumb.path) })),
    { name: product.title },
  ];

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={crumbs} />
      <JsonLd
        data={productLd(product, {
          url: absoluteUrl(productHref(product.slug), locale),
          sellerName: tMeta('siteName'),
        })}
      />

      <VariantProvider variants={product.variants}>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          <ProductGallery images={product.images} />

          <div className="flex flex-col gap-5">
            <div>
              {product.brand && (
                <Link
                  href={brandHref(product.brand.slug)}
                  className="text-sm font-semibold tracking-[0.05em] text-muted-foreground uppercase hover:text-primary"
                >
                  {product.brand.name}
                </Link>
              )}
              <h1 className="mt-1 text-2xl leading-tight font-bold md:text-3xl">{product.title}</h1>
              {(product.isSale || product.isAntidron) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.isSale && (
                    <Badge variant="promo" asChild>
                      <Link href="/sale">{tListing('sale')}</Link>
                    </Badge>
                  )}
                  {product.isAntidron && (
                    <Badge variant="secondary" asChild>
                      <Link href="/antidron">{tListing('antidron')}</Link>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-muted-foreground">{product.shortDescription}</p>
            )}

            <ProductPurchase
              productSku={product.sku}
              price={product.price}
              hasPriceRange={product.hasPriceRange}
              stock={product.stock}
            />
          </div>
        </div>
      </VariantProvider>

      {(product.description || product.attributes.length > 0) && (
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
          {product.description && (
            <section aria-labelledby="product-description">
              <h2 id="product-description" className="mb-4 text-xl font-bold">
                {t('description')}
              </h2>
              <div className="leading-relaxed whitespace-pre-line text-muted-foreground">
                {product.description}
              </div>
            </section>
          )}
          {product.attributes.length > 0 && (
            <section aria-labelledby="product-specs">
              <h2 id="product-specs" className="mb-4 text-xl font-bold">
                {t('specs')}
              </h2>
              <Specs attributes={product.attributes} />
            </section>
          )}
        </div>
      )}

      <ProductRail
        title={t('related')}
        products={related}
        more={
          product.category
            ? {
                href: categoryHref(product.category.path),
                label: t('allInCategory', { name: product.category.name }),
              }
            : undefined
        }
        className="mt-14"
      />
    </div>
  );
}

function Specs({ attributes }: { attributes: ProductAttributeDto[] }) {
  return (
    <dl className="divide-y rounded-md border bg-card text-sm">
      {attributes.map((attribute) => (
        <div
          key={attribute.code}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5"
        >
          <dt className="text-muted-foreground">{attribute.name}</dt>
          <dd>
            {attribute.values.map((v) => v.text).join(', ')}
            {attribute.unit ? ` ${attribute.unit}` : ''}
          </dd>
        </div>
      ))}
    </dl>
  );
}
