import { createApiClient } from '@ml/api-client';
import { loadWebEnv } from '@ml/config';

/**
 * Server-side API client (Server Components, Route Handlers, Server Actions).
 * Next.js talks to data only through the API and this generated client (rule 1).
 */
export const api = createApiClient({ baseUrl: loadWebEnv().API_URL });

/**
 * How long API data may be reused by the Next.js Data Cache (seconds). Structure changes rarely;
 * commerce data (price, stock) stays short — checkout recalculates everything anyway (rule 2).
 */
export const CACHE_TTL = {
  /** Category tree, category pages, brands. */
  structure: 3600,
  /** Product cards, product rails: price and availability. */
  commerce: 60,
} as const;

/** Data Cache tags, for on-demand invalidation after admin edits / Tria sync (13.4, 11.x). */
export const CACHE_TAGS = {
  categories: 'categories',
  brands: 'brands',
  products: 'products',
  product: (slug: string) => `product:${slug}`,
} as const;

/**
 * Per-call option that stores the API response in the Next.js Data Cache. The generated client
 * calls `fetch(request)`, so Next.js cache options must go through a wrapped `fetch`.
 * Expired entries are served stale while Next.js refreshes them in the background, so renders
 * after the TTL do not wait for the API.
 */
export function cached(revalidate: number, tags: string[]): { fetch: typeof fetch } {
  return { fetch: (input, init) => fetch(input, { ...init, next: { revalidate, tags } }) };
}
