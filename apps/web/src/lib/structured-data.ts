import type { PriceDto, ProductDetailDto, ProductVariantDto } from '@ml/api-client';

// Schema.org JSON-LD builders (§41, §67.3). Pure: URLs come in absolute, so they are unit-tested.
// Only facts that are visible on the page go in (no invented ratings, reviews or stock).

type JsonLd = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

export interface BreadcrumbItem {
  name: string;
  /** Absolute URL; omitted for the current page (last item). */
  url?: string;
}

/** Home › … › current page, as shown in the visible breadcrumbs. */
export function breadcrumbListLd(items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

const GTIN = /^\d{8}$|^\d{12,14}$/;

function offerLd(
  price: PriceDto,
  inStock: boolean,
  url: string,
  sellerName: string,
  sku?: string,
): JsonLd {
  return {
    '@type': 'Offer',
    ...(sku ? { sku } : {}),
    url,
    price: price.amount,
    priceCurrency: price.currency,
    availability: `${CONTEXT}/${inStock ? 'InStock' : 'OutOfStock'}`,
    itemCondition: `${CONTEXT}/NewCondition`,
    seller: { '@type': 'Organization', name: sellerName },
  };
}

/** One offer per priced variant; products without variants fall back to the product price. */
function offersLd(product: ProductDetailDto, url: string, sellerName: string): JsonLd[] {
  const priced = product.variants.filter(
    (v): v is ProductVariantDto & { price: PriceDto } => v.price !== null,
  );
  if (priced.length > 0) {
    return priced.map((v) => offerLd(v.price, v.stock.inStock, url, sellerName, v.sku));
  }
  return product.price ? [offerLd(product.price, product.stock.inStock, url, sellerName)] : [];
}

/**
 * Product + Offer(s) from current API data: name, description, images, sku, gtin, brand,
 * category path, specifications (additionalProperty) and one Offer per priced variant.
 * No price on the page → no offers (never a made-up price).
 */
export function productLd(
  product: ProductDetailDto,
  { url, sellerName }: { url: string; sellerName: string },
): JsonLd {
  const offers = offersLd(product, url, sellerName);
  const barcodes = product.variants.map((v) => v.barcode).filter((b): b is string => !!b);
  const gtin =
    product.variants.length === 1 && barcodes[0] && GTIN.test(barcodes[0]) ? barcodes[0] : null;
  const description = product.shortDescription ?? product.description;

  return {
    '@context': CONTEXT,
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.title,
    url,
    sku: product.sku,
    ...(gtin ? { gtin } : {}),
    ...(description ? { description } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((i) => i.url) } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    ...(product.breadcrumbs.length > 0
      ? { category: product.breadcrumbs.map((b) => b.name).join(' > ') }
      : {}),
    ...(product.attributes.length > 0
      ? {
          additionalProperty: product.attributes.map((a) => ({
            '@type': 'PropertyValue',
            name: a.name,
            value: a.values.map((v) => v.text).join(', '),
            ...(a.unit ? { unitText: a.unit } : {}),
          })),
        }
      : {}),
    ...(offers.length === 1 ? { offers: offers[0] } : offers.length > 1 ? { offers } : {}),
  };
}

/**
 * JSON for a `<script type="application/ld+json">`: `<` is escaped so text from the catalogue
 * (e.g. `</script>` in a description) cannot break out of the script element.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
