'use client';

import type { SearchFacetsDto } from '@ml/api-client';
import { createContext, type ReactNode, use } from 'react';
import type { FlagKey, ListingState } from '@/lib/listing-params';

/** Filters the page scope already fixes (e.g. `sale` on /sale, `brand` on a brand page). */
export type HiddenFilters = Partial<Record<'brand' | FlagKey, boolean>>;

export interface ListingContextValue {
  /** Locale-free path of the listing, e.g. `/category/zbroia`. */
  basePath: string;
  state: ListingState;
  facets: SearchFacetsDto;
  hidden: HiddenFilters;
  total: number;
}

const ListingContext = createContext<ListingContextValue | null>(null);

/**
 * Hands the listing state and facets to the client controls (sidebar, mobile drawer, sort) once:
 * passing them as props to each control would serialize the facets (hundreds of brands) repeatedly.
 */
export function ListingProvider({
  children,
  ...value
}: ListingContextValue & { children: ReactNode }) {
  return <ListingContext value={value}>{children}</ListingContext>;
}

export function useListing(): ListingContextValue {
  const value = use(ListingContext);
  if (!value) throw new Error('useListing() must be used inside <ListingProvider>');
  return value;
}
