import {
  type BrandDetailDto,
  type BrandListItemDto,
  brandsBySlug,
  brandsList,
  categoriesGetByPath,
  categoriesGetTree,
  type CategoryDetailDto,
  type CategoryNodeDto,
  type ProductDetailDto,
  type ProductListItemDto,
  productsBySlug,
  searchFind,
  type SearchFindData,
  type SearchResultDto,
  searchSuggest,
  type SuggestResultDto,
} from '@ml/api-client';
import { cache } from 'react';
import { api } from '@/lib/api';
import type { Locale } from '@/i18n/routing';

// Server-only: imports the API client (reads env via node:fs).

/**
 * Category tree for menus (header, mobile nav, footer). Deduplicated per request.
 * Names come localized from the API (field-level fallback to uk).
 * Returns [] when the API is unreachable: navigation must never break the page.
 */
export const getCategoryTree = cache(async (locale: Locale): Promise<CategoryNodeDto[]> => {
  try {
    const { data } = await categoriesGetTree({ client: api, query: { locale } });
    return data?.items ?? [];
  } catch {
    return [];
  }
});

/** API 404 → `null` (the page answers 404); any other failure throws (error page). */
function orNotFound<T>({
  data,
  error,
  response,
}: {
  data?: T;
  error?: unknown;
  response?: Response;
}): T | null {
  if (data !== undefined) return data;
  if (response?.status === 404) return null;
  throw new Error(`API request failed: ${response?.status ?? 'no response'}`, { cause: error });
}

/** Category page data (breadcrumbs, subcategories). Shared by `generateMetadata` and the page. */
export const getCategory = cache(
  async (locale: Locale, path: string): Promise<CategoryDetailDto | null> =>
    orNotFound(await categoriesGetByPath({ client: api, query: { locale, path } })),
);

/**
 * Listing page: products + facets from the search API. `null` when the scope does not exist
 * (hidden/unknown category). Cached per request by the serialized query.
 */
export const searchListing = (query: SearchFindData['query']) =>
  searchListingCached(JSON.stringify(query));

const searchListingCached = cache(async (key: string): Promise<SearchResultDto | null> =>
  orNotFound(await searchFind({ client: api, query: JSON.parse(key) as SearchFindData['query'] })),
);

/** Product page data. Shared by `generateMetadata` and the page. */
export const getProduct = cache(
  async (locale: Locale, slug: string): Promise<ProductDetailDto | null> =>
    orNotFound(await productsBySlug({ client: api, path: { slug }, query: { locale } })),
);

/**
 * "Related" block: other in-stock products from the same category. Optional content:
 * any failure yields [] so the product page still renders.
 */
export async function getRelatedProducts(
  locale: Locale,
  product: ProductDetailDto,
  limit = 8,
): Promise<ProductListItemDto[]> {
  if (!product.category) return [];
  try {
    const result = await searchListing({
      locale,
      category: product.category.path,
      inStock: true,
      sort: 'relevance',
      page: 1,
      limit: limit + 1,
    });
    return (result?.items ?? []).filter((item) => item.id !== product.id).slice(0, limit);
  } catch {
    return [];
  }
}

/** All brands with products, by name (for `/brands`). */
export const getBrands = cache(async (locale: Locale): Promise<BrandListItemDto[]> => {
  const list = orNotFound(await brandsList({ client: api, query: { locale } }));
  return list?.items ?? [];
});

/** Brand page header (description, logo, SEO). Shared by `generateMetadata` and the page. */
export const getBrand = cache(
  async (locale: Locale, slug: string): Promise<BrandDetailDto | null> =>
    orNotFound(await brandsBySlug({ client: api, path: { slug }, query: { locale } })),
);

/**
 * Autocomplete for the header search. `null` when the API fails (the dropdown just stays empty;
 * the form still submits to `/search`).
 */
export async function getSuggestions(
  locale: Locale,
  q: string,
  limit = 6,
): Promise<SuggestResultDto | null> {
  try {
    const { data } = await searchSuggest({ client: api, query: { locale, q, limit } });
    return data ?? null;
  } catch {
    return null;
  }
}
