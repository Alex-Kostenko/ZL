import type { ProductDetailDto, ProductVariantDto } from '@ml/api-client';
import { describe, expect, it } from 'vitest';
import { breadcrumbListLd, productLd, serializeJsonLd } from './structured-data';

const URL = 'https://shop.example/product/rifle';
const price = (amount: string) => ({
  currency: 'UAH',
  amount,
  oldAmount: null,
  discountPercent: null,
});

function variant(
  sku: string,
  amount: string | null,
  inStock: boolean,
  barcode: string | null = null,
): ProductVariantDto {
  return {
    id: sku,
    sku,
    barcode,
    options: [],
    price: amount ? price(amount) : null,
    stock: { available: inStock ? 1 : 0, inStock, warehouses: [] },
  };
}

const base: ProductDetailDto = {
  locale: 'uk',
  id: 'p1',
  slug: 'rifle',
  sku: 'ML-1',
  title: 'Rifle X',
  shortDescription: 'Short',
  description: 'Long',
  brand: { id: 'b1', slug: 'acme', name: 'Acme' },
  category: { id: 'c1', path: 'zbroia/narezna', name: 'Нарізна' },
  breadcrumbs: [
    { name: 'Зброя', path: 'zbroia' },
    { name: 'Нарізна', path: 'zbroia/narezna' },
  ],
  images: [
    { url: 'https://cdn.example/1.webp', width: 800, height: 800, alt: 'Rifle', variantId: null },
  ],
  attributes: [
    {
      code: 'caliber',
      name: 'Калібр',
      unit: null,
      type: 'SELECT',
      values: [{ text: '.308 Win', code: '308' }],
    },
    {
      code: 'length',
      name: 'Довжина',
      unit: 'мм',
      type: 'NUMBER',
      values: [{ text: '1100', code: null }],
    },
  ],
  variants: [variant('ML-1-1', '1000.00', true, '4006381333931')],
  price: price('1000.00'),
  hasPriceRange: false,
  stock: { available: 1, inStock: true, warehouses: [] },
  isSale: false,
  isAntidron: false,
  publishedAt: null,
};

describe('productLd', () => {
  it('describes a single-variant product with one offer', () => {
    const ld = productLd(base, { url: URL, sellerName: 'Shop' });
    expect(ld).toMatchObject({
      '@type': 'Product',
      name: 'Rifle X',
      sku: 'ML-1',
      gtin: '4006381333931',
      description: 'Short',
      image: ['https://cdn.example/1.webp'],
      brand: { '@type': 'Brand', name: 'Acme' },
      category: 'Зброя > Нарізна',
      offers: {
        '@type': 'Offer',
        price: '1000.00',
        priceCurrency: 'UAH',
        availability: 'https://schema.org/InStock',
        url: URL,
      },
    });
    expect(ld.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Калібр', value: '.308 Win' },
      { '@type': 'PropertyValue', name: 'Довжина', value: '1100', unitText: 'мм' },
    ]);
  });

  it('lists one offer per priced variant', () => {
    const ld = productLd(
      {
        ...base,
        variants: [
          variant('A', '10.00', true, '4006381333931'),
          variant('B', '12.00', false),
          variant('C', null, true),
        ],
      },
      { url: URL, sellerName: 'Shop' },
    );
    expect(ld.gtin).toBeUndefined(); // barcodes belong to variants
    expect(ld.offers).toEqual([
      expect.objectContaining({
        sku: 'A',
        price: '10.00',
        availability: 'https://schema.org/InStock',
      }),
      expect.objectContaining({
        sku: 'B',
        price: '12.00',
        availability: 'https://schema.org/OutOfStock',
      }),
    ]);
  });

  it('omits offers when nothing is priced and skips empty fields', () => {
    const ld = productLd(
      {
        ...base,
        shortDescription: null,
        description: null,
        brand: null,
        images: [],
        attributes: [],
        breadcrumbs: [],
        variants: [variant('A', null, false, 'not-a-gtin')],
        price: null,
      },
      { url: URL, sellerName: 'Shop' },
    );
    expect(Object.keys(ld).sort()).toEqual(['@context', '@id', '@type', 'name', 'sku', 'url']);
  });
});

describe('breadcrumbListLd', () => {
  it('numbers items and leaves the current page without a link', () => {
    expect(
      breadcrumbListLd([{ name: 'Головна', url: 'https://shop.example/' }, { name: 'Бренди' }]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://shop.example/' },
        { '@type': 'ListItem', position: 2, name: 'Бренди' },
      ],
    });
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so catalogue text cannot close the script tag', () => {
    const json = serializeJsonLd({ description: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual({ description: '</script><script>alert(1)</script>' });
  });
});
