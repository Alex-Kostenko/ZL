import { describe, expect, it } from 'vitest';
import type { LocalizedCategory } from '../catalog/categories/category-tree';
import { StockSnapshot } from '../catalog/inventory/inventory.service';
import {
  CategoryLookup,
  type DocumentContext,
  facetValues,
  type IndexedAttributeValueRow,
  plainText,
  type ProductSourceRow,
  toProductDocument,
} from './product-document';
import { productIndexSettings } from './product-index';

const category = (id: string, path: string, name: string): LocalizedCategory => ({
  id,
  parentId: null,
  slug: path.split('/').at(-1)!,
  path,
  depth: path.split('/').length - 1,
  name,
  description: null,
  icon: null,
  image: null,
});

const attr = (
  code: string,
  type: string,
  value: Partial<IndexedAttributeValueRow>,
  flags = { isFilterable: true, isSearchable: false },
): IndexedAttributeValueRow => ({
  attributeId: code,
  variantId: null,
  valueNumber: null,
  valueNumberTo: null,
  valueBoolean: null,
  valueText: null,
  value: null,
  ...value,
  attribute: {
    code,
    type,
    position: 0,
    ...flags,
    translations: [{ locale: 'uk', name: code === 'calibre' ? 'Калібр' : code, unit: null }],
  },
});

const option = (code: string, label: string) => ({
  code,
  position: 0,
  translations: [{ locale: 'uk', label }],
});

const warehouse = (code: string, isActive = true) => ({ code, name: code, position: 0, isActive });

function context(overrides: Partial<DocumentContext> = {}): DocumentContext {
  return {
    locale: 'uk',
    fallback: 'uk',
    publicBaseUrl: 'https://cdn.test',
    prices: new Map([
      ['v1', { currency: 'UAH', amount: '1500.00', oldAmount: '2000.00', discountPercent: 25 }],
      ['v2', { currency: 'UAH', amount: '1800.00', oldAmount: null, discountPercent: null }],
    ]),
    stock: new StockSnapshot(
      new Map([
        ['v1', [{ available: 3, warehouse: warehouse('kyiv') }]],
        [
          'v2',
          [
            { available: 2, warehouse: warehouse('lviv') },
            { available: 9, warehouse: warehouse('closed', false) },
          ],
        ],
      ]),
    ),
    categories: new CategoryLookup([
      category('c-root', 'zbroia', 'Зброя'),
      category('c-guns', 'zbroia/rushnytsi', 'Рушниці'),
      category('c-knives', 'zbroia/nozhi', 'Ножі'),
    ]),
    ...overrides,
  };
}

function product(overrides: Partial<ProductSourceRow> = {}): ProductSourceRow {
  return {
    id: 'p1',
    slug: 'rushnytsia-beretta',
    sku: 'B-1',
    isSale: true,
    isAntidron: false,
    publishedAt: new Date('2026-01-02T03:04:05.678Z'),
    translations: [
      {
        locale: 'uk',
        title: 'Рушниця Beretta',
        shortDescription: null,
        description: '<p>Надійна&nbsp;рушниця</p><ul><li>12/70</li></ul>',
      },
      { locale: 'en', title: 'Beretta shotgun', shortDescription: 'Reliable', description: null },
    ],
    brand: { id: 'b1', slug: 'beretta', name: 'Beretta', isActive: true },
    media: [],
    // c-hidden is not visible (not in the lookup): skipped without error.
    categories: [{ categoryId: 'c-guns' }, { categoryId: 'c-hidden' }],
    variants: [
      { id: 'v1', sku: 'B-1-A', barcode: '4820000000011' },
      { id: 'v2', sku: 'B-1', barcode: null },
    ],
    attributeValues: [],
    ...overrides,
  };
}

describe('toProductDocument', () => {
  it('builds the listing tile and the search fields', () => {
    const doc = toProductDocument(product(), context());

    expect(doc).toMatchObject({
      id: 'p1',
      title: 'Рушниця Beretta',
      brand: { id: 'b1', slug: 'beretta', name: 'Beretta' },
      price: { amount: '1500.00', oldAmount: '2000.00' },
      priceAmount: 1500,
      hasPriceRange: true,
      available: 5,
      inStock: true,
      warehouses: ['kyiv', 'lviv'],
      variantCount: 2,
      publishedAt: 1767323045,
      categories: ['zbroia', 'zbroia/rushnytsi'],
      categoryNames: ['Зброя', 'Рушниці'],
      variantSkus: ['B-1-A'],
      barcodes: ['4820000000011'],
      description: 'Надійна рушниця 12/70',
      shortDescription: null,
    });
  });

  it('localizes with per-field fallback to the default locale', () => {
    const doc = toProductDocument(product(), context({ locale: 'en' }));
    expect(doc.title).toBe('Beretta shotgun');
    expect(doc.shortDescription).toBe('Reliable');
    expect(doc.description).toBe('Надійна рушниця 12/70');
  });

  it('hides an inactive brand and handles products without price or stock', () => {
    const doc = toProductDocument(
      product({
        brand: { id: 'b1', slug: 'old', name: 'Old', isActive: false },
        variants: [{ id: 'v9', sku: 'X', barcode: null }],
      }),
      context(),
    );
    expect(doc).toMatchObject({
      brand: null,
      price: null,
      priceAmount: null,
      hasPriceRange: false,
      available: 0,
      inStock: false,
      warehouses: [],
    });
  });

  it('ignores attribute values of inactive variants and splits filterable/searchable', () => {
    const doc = toProductDocument(
      product({
        attributeValues: [
          attr(
            'calibre',
            'SELECT',
            { value: option('12-70', '12/70') },
            { isFilterable: true, isSearchable: true },
          ),
          attr('colour', 'SELECT', { variantId: 'v1', value: option('black', 'Чорний') }),
          attr('colour', 'SELECT', { variantId: 'v-inactive', value: option('red', 'Червоний') }),
          attr(
            'model',
            'STRING',
            { valueText: 'A400' },
            { isFilterable: false, isSearchable: true },
          ),
        ],
      }),
      context(),
    );
    expect(doc.attrs).toEqual({ calibre: ['12-70'], colour: ['black'] });
    expect(doc.attributesText).toEqual(['Калібр 12/70', 'model A400']);
  });
});

describe('facetValues', () => {
  it('keeps raw values by attribute type, deduplicated across variants', () => {
    expect(
      facetValues([
        attr('size', 'MULTI_SELECT', { value: option('m', 'M') }),
        attr('size', 'MULTI_SELECT', { variantId: 'v1', value: option('l', 'L') }),
        attr('size', 'MULTI_SELECT', { variantId: 'v2', value: option('m', 'M') }),
        attr('length', 'NUMBER', { valueNumber: '95.5000' }),
        attr('waterproof', 'BOOLEAN', { valueBoolean: false }),
        attr('temp', 'RANGE', { variantId: 'v1', valueNumber: '-10', valueNumberTo: '5' }),
        attr('temp', 'RANGE', { variantId: 'v2', valueNumber: '-20', valueNumberTo: '0' }),
        attr('standard', 'STRING', { valueText: 'CIP' }),
      ]),
    ).toEqual({
      size: ['m', 'l'],
      length: [95.5],
      waterproof: [false],
      temp: { min: -20, max: 5 },
      standard: ['CIP'],
    });
  });

  it('drops attributes without usable values', () => {
    expect(facetValues([attr('size', 'SELECT', {})])).toEqual({});
  });
});

describe('CategoryLookup', () => {
  it('returns visible categories with ancestors once, shallowest first', () => {
    const lookup = new CategoryLookup([
      category('a', 'a', 'A'),
      category('ab', 'a/b', 'AB'),
      category('ac', 'a/c', 'AC'),
    ]);
    expect(lookup.withAncestors(['ac', 'ab', 'missing']).map((c) => c.path)).toEqual([
      'a',
      'a/b',
      'a/c',
    ]);
  });
});

describe('plainText', () => {
  it('strips markup and collapses whitespace', () => {
    expect(plainText('<h2>Опис</h2>\n<p>Tom &amp; Jerry&#39;s</p>')).toBe("Опис Tom & Jerry's");
    expect(plainText('<p> </p>')).toBeNull();
    expect(plainText(null)).toBeNull();
  });
});

describe('productIndexSettings', () => {
  it('uses the Meilisearch language of known locales only', () => {
    expect(productIndexSettings('uk').localizedAttributes).toEqual([
      { attributePatterns: ['*'], locales: ['ukr'] },
    ]);
    expect(productIndexSettings('pl').localizedAttributes).toEqual([]);
  });

  it('shows exactly the listing tile', () => {
    expect(productIndexSettings('uk').displayedAttributes).not.toContain('description');
  });
});
