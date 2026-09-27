import {
  categoriesGetByPath,
  categoriesGetTree,
  type CategoryDetailDto,
  type CategoryNodeDto,
  searchFind,
  type SearchFindData,
  type SearchResultDto,
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
