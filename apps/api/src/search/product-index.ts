import type { Locale as MeiliLocale, Settings } from 'meilisearch';
import type { PriceDto } from '../catalog/pricing/pricing.dto';
import type { ProductBrandDto, ProductImageDto } from '../catalog/products/products.dto';

/**
 * Filter/facet value of one attribute on a product (union over the product and its active
 * variants): SELECT/MULTI_SELECT → option codes, NUMBER → numbers, BOOLEAN → booleans,
 * STRING → texts, RANGE → overall bounds.
 */
export type AttributeFacetValue = string[] | number[] | boolean[] | { min: number; max: number };

/**
 * One product in the search index of one locale (§12). A superset of the listing tile
 * (`ProductListItemDto`), so category/search listings render without touching PostgreSQL (7.4).
 * Only published products are indexed; texts are already localized with per-field fallback.
 */
export interface ProductDocument {
  // --- listing tile (displayed) ---
  id: string;
  slug: string;
  sku: string;
  title: string;
  brand: ProductBrandDto | null;
  image: ProductImageDto | null;
  price: PriceDto | null;
  hasPriceRange: boolean;
  available: number;
  inStock: boolean;
  isSale: boolean;
  isAntidron: boolean;
  variantCount: number;

  // --- filtering and sorting ---
  /** `price.amount` as a number: price-range filter and sort (display uses `price`). */
  priceAmount: number | null;
  /** Unix seconds; default order within equal relevance is newest first. */
  publishedAt: number | null;
  /** Paths of the product's visible categories and all their ancestors: `categories = "zbroia"` matches the subtree. */
  categories: string[];
  /** Codes of active warehouses with stock ("available in the Kyiv shop"). */
  warehouses: string[];
  /** Filterable attributes by attribute code; facets return codes, labels come from the API. */
  attrs: Record<string, AttributeFacetValue>;

  // --- full-text only ---
  variantSkus: string[];
  barcodes: string[];
  /** Localized names of `categories`. */
  categoryNames: string[];
  /** Searchable attributes as "Name value unit" phrases. */
  attributesText: string[];
  shortDescription: string | null;
  /** Plain text (markup stripped). */
  description: string | null;
}

/** One index per locale: language-specific tokenization and ranking, localized facets. */
export const productIndexUid = (prefix: string, locale: string): string =>
  `${prefix}_products_${locale}`;

/** Store locale → Meilisearch language (ISO 639-3); unknown locales use auto-detection. */
const MEILI_LANGUAGES: Record<string, MeiliLocale> = { uk: 'ukr', ru: 'rus', en: 'eng' };

/** Fields returned by search: exactly the listing tile. */
export const DISPLAYED_ATTRIBUTES = [
  'id',
  'slug',
  'sku',
  'title',
  'brand',
  'image',
  'price',
  'hasPriceRange',
  'available',
  'inStock',
  'isSale',
  'isAntidron',
  'variantCount',
] as const satisfies readonly (keyof ProductDocument)[];

/**
 * Index settings (§12). Searchable fields are ordered by importance (the `attribute` rule);
 * identifiers are matched without typos. With equal relevance (and always for an empty query,
 * i.e. a category page) in-stock products come first, then the newest.
 */
export function productIndexSettings(locale: string): Settings {
  const language = MEILI_LANGUAGES[locale];
  return {
    searchableAttributes: [
      'title',
      'sku',
      'variantSkus',
      'barcodes',
      'brand.name',
      'categoryNames',
      'attributesText',
      'shortDescription',
      'description',
    ] satisfies SearchablePath[],
    displayedAttributes: [...DISPLAYED_ATTRIBUTES],
    // A parent field makes every nested one filterable: `attrs` covers `attrs.<code>`.
    filterableAttributes: [
      'categories',
      'brand.slug',
      'priceAmount',
      'inStock',
      'isSale',
      'isAntidron',
      'warehouses',
      'attrs',
    ] satisfies SearchablePath[],
    sortableAttributes: ['priceAmount', 'publishedAt', 'title'] satisfies SearchablePath[],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'inStock:desc',
      'publishedAt:desc',
    ],
    typoTolerance: { enabled: true, disableOnAttributes: ['sku', 'variantSkus', 'barcodes'] },
    faceting: { maxValuesPerFacet: 500, sortFacetValuesBy: { '*': 'count' } },
    // Deepest reachable result: page × limit ≤ 10 000 (larger listings need narrower filters).
    pagination: { maxTotalHits: 10_000 },
    // Facet values are codes, not text: nothing to search in them.
    facetSearch: false,
    prefixSearch: 'indexingTime',
    // Word proximity per attribute, not per word: much faster indexing, same ranking for titles.
    proximityPrecision: 'byAttribute',
    localizedAttributes: language ? [{ attributePatterns: ['*'], locales: [language] }] : [],
  };
}

type SearchablePath = keyof ProductDocument | 'brand.name' | 'brand.slug';
