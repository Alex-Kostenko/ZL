import { categoriesGetTree, type CategoryNodeDto } from '@ml/api-client';
import { cache } from 'react';
import { api } from '@/lib/api';

// TODO(8.3): locale comes from the route.
const LOCALE = 'uk';

// Server-only: imports the API client (reads env via node:fs).

/**
 * Category tree for menus (header, mobile nav, footer). Deduplicated per request.
 * Returns [] when the API is unreachable: navigation must never break the page.
 */
export const getCategoryTree = cache(async (): Promise<CategoryNodeDto[]> => {
  try {
    const { data } = await categoriesGetTree({ client: api, query: { locale: LOCALE } });
    return data?.items ?? [];
  } catch {
    return [];
  }
});
