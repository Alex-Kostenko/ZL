import { categoriesGetTree, type CategoryNodeDto } from '@ml/api-client';
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
