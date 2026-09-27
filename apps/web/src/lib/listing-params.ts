// Listing URL state (category, brand, showcase and search pages): parse, serialize, edit.
// Pure and client-safe: filter links are built both on the server and in client components.
//
// URL format (readable, one key per filter group, stable order):
//   /category/zbroia?brand=blaser,sauer&price=10000..50000&caliber=308-win&barrel_length=..600
//     &in_stock=1&sort=price_asc&page=2
// Attribute filters use the attribute code as the key: `v1,v2` (any of) or `min..max`.

import type { SearchFindData } from '@ml/api-client';

export const LISTING_SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'title'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export const PAGE_SIZE = 24;
/** The search API serves at most 10 000 hits (`page × limit`). */
export const MAX_PAGE = Math.floor(10_000 / PAGE_SIZE);

/** Keys that are not attribute codes. Attribute codes must not collide with these. */
const RESERVED_KEYS = new Set([
  'q',
  'brand',
  'price',
  'in_stock',
  'sale',
  'antidron',
  'sort',
  'page',
]);
const ATTR_CODE = /^[a-z][a-z0-9_]{0,63}$/;
/** Tracking parameters: never filters, dropped from canonical URLs. */
const TRACKING_KEY = /^(utm_\w+|gclid|gbraid|wbraid|fbclid|yclid|msclkid|srsltid|_ga|_gl)$/;
const RANGE = /^(-?\d+(?:\.\d+)?)?\.\.(-?\d+(?:\.\d+)?)?$/;

export interface NumberRange {
  min: number | null;
  max: number | null;
}

export type FlagKey = 'inStock' | 'sale' | 'antidron';

export interface ListingState {
  q: string;
  brands: string[];
  price: NumberRange | null;
  /** Attribute code → option values (any of) or a numeric range. */
  attrs: Record<string, string[] | NumberRange>;
  inStock: boolean;
  sale: boolean;
  antidron: boolean;
  sort: ListingSort;
  page: number;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export const EMPTY_LISTING: ListingState = {
  q: '',
  brands: [],
  price: null,
  attrs: {},
  inStock: false,
  sale: false,
  antidron: false,
  sort: 'relevance',
  page: 1,
};

// ---------- parse ----------

/** Lenient: invalid values are dropped, so stale or hand-edited links never fail. */
export function parseListingParams(params: SearchParams): ListingState {
  const get = (key: string): string => {
    const value = params[key];
    return (Array.isArray(value) ? value.join(',') : (value ?? '')).trim();
  };

  const attrs: ListingState['attrs'] = {};
  for (const key of Object.keys(params).sort()) {
    if (RESERVED_KEYS.has(key) || TRACKING_KEY.test(key) || !ATTR_CODE.test(key)) continue;
    const value = parseAttrValue(get(key));
    if (value) attrs[key] = value;
  }

  const page = Number(get('page'));
  const sort = get('sort') as ListingSort;

  return {
    q: get('q').slice(0, 200),
    brands: parseList(get('brand')),
    price: parseRange(get('price')),
    attrs,
    inStock: parseFlag(get('in_stock')),
    sale: parseFlag(get('sale')),
    antidron: parseFlag(get('antidron')),
    sort: LISTING_SORTS.includes(sort) ? sort : 'relevance',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

const parseFlag = (value: string) => value === '1' || value === 'true';

function parseList(value: string): string[] {
  const items = value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 100);
  return [...new Set(items)].sort();
}

function parseRange(value: string): NumberRange | null {
  const match = RANGE.exec(value);
  if (!match) return null;
  let min = match[1] === undefined ? null : Number(match[1]);
  let max = match[2] === undefined ? null : Number(match[2]);
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return { min, max };
}

function parseAttrValue(value: string): string[] | NumberRange | null {
  if (value.includes('..')) return parseRange(value);
  const list = parseList(value);
  return list.length > 0 ? list : null;
}

// ---------- serialize ----------

/** Query string with a stable key order (`?a=1&b=2`), or `''`. Defaults are omitted. */
export function serializeListingParams(state: ListingState): string {
  const parts: [string, string][] = [];
  if (state.q) parts.push(['q', state.q]);
  if (state.brands.length > 0) parts.push(['brand', state.brands.join(',')]);
  if (state.price) parts.push(['price', formatRange(state.price)]);
  for (const code of Object.keys(state.attrs).sort()) {
    const value = state.attrs[code]!;
    parts.push([code, Array.isArray(value) ? value.join(',') : formatRange(value)]);
  }
  if (state.inStock) parts.push(['in_stock', '1']);
  if (state.sale) parts.push(['sale', '1']);
  if (state.antidron) parts.push(['antidron', '1']);
  if (state.sort !== 'relevance') parts.push(['sort', state.sort]);
  if (state.page > 1) parts.push(['page', String(state.page)]);
  if (parts.length === 0) return '';
  // `,` and `:` are legal in a query; keep them readable.
  return `?${parts
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ',').replace(/%3A/g, ':')}`)
    .join('&')}`;
}

const formatRange = ({ min, max }: NumberRange) => `${min ?? ''}..${max ?? ''}`;

/** Locale-free listing URL; render it with `Link` from `@/i18n/navigation`. */
export const listingHref = (basePath: string, state: ListingState) =>
  `${basePath}${serializeListingParams(state)}`;

// ---------- edit (every filter change goes back to page 1) ----------

export function toggleBrand(state: ListingState, slug: string): ListingState {
  return { ...state, brands: toggle(state.brands, slug), page: 1 };
}

export function toggleAttrValue(state: ListingState, code: string, value: string): ListingState {
  const current = state.attrs[code];
  const values = toggle(Array.isArray(current) ? current : [], value);
  return withAttr(state, code, values.length > 0 ? values : null);
}

export function setAttrRange(
  state: ListingState,
  code: string,
  range: NumberRange | null,
): ListingState {
  return withAttr(state, code, normalizeRange(range));
}

export function setPrice(state: ListingState, range: NumberRange | null): ListingState {
  return { ...state, price: normalizeRange(range), page: 1 };
}

export function toggleFlag(state: ListingState, flag: FlagKey): ListingState {
  return { ...state, [flag]: !state[flag], page: 1 };
}

export function clearFilters(state: ListingState): ListingState {
  return { ...EMPTY_LISTING, q: state.q, sort: state.sort };
}

export const withSort = (state: ListingState, sort: ListingSort): ListingState => ({
  ...state,
  sort,
  page: 1,
});

export const withPage = (state: ListingState, page: number): ListingState => ({ ...state, page });

function withAttr(
  state: ListingState,
  code: string,
  value: string[] | NumberRange | null,
): ListingState {
  const attrs = { ...state.attrs };
  if (value) attrs[code] = value;
  else delete attrs[code];
  return { ...state, attrs, page: 1 };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value].sort();
}

function normalizeRange(range: NumberRange | null): NumberRange | null {
  if (!range) return null;
  const fix = (n: number | null) => (n === null || !Number.isFinite(n) ? null : n);
  return parseRange(formatRange({ min: fix(range.min), max: fix(range.max) }));
}

/** Pages to show: first, last and a window around the current one; `null` = gap. */
export function paginationRange(current: number, total: number, window = 1): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let page = 1; page <= total; page++) {
    const edge = page === 1 || page === total;
    const near = Math.abs(page - current) <= window;
    // A gap of exactly one page shows that page instead of "…".
    const bridge =
      (page === 2 && current - window === 3) ||
      (page === total - 1 && current + window === total - 2);
    if (edge || near || bridge) pages.push(page);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

// ---------- queries ----------

/** Number of applied filters (sort, page and the text query do not count). */
export function activeFilterCount(state: ListingState): number {
  return (
    state.brands.length +
    (state.price ? 1 : 0) +
    Object.keys(state.attrs).length +
    Number(state.inStock) +
    Number(state.sale) +
    Number(state.antidron)
  );
}

/**
 * Drops attribute filters the API does not know (it ignores them). The search response lists every
 * selected filterable attribute in `facets.attributes`, so anything else is noise (old links).
 */
export function pruneUnknownAttrs(state: ListingState, knownCodes: Iterable<string>): ListingState {
  const known = new Set(knownCodes);
  const attrs = Object.fromEntries(Object.entries(state.attrs).filter(([code]) => known.has(code)));
  return { ...state, attrs };
}

type SearchQuery = SearchFindData['query'];

/** Fixed scope of a listing page, e.g. the category of a category page. */
export type ListingScope = Pick<SearchQuery, 'category' | 'brand' | 'sale' | 'antidron'>;

/** Search API query for a listing state; `scope` wins over URL filters. */
export function toSearchQuery(
  state: ListingState,
  scope: ListingScope,
  locale: string,
): SearchQuery {
  const attr = Object.entries(state.attrs).map(
    ([code, value]) => `${code}:${Array.isArray(value) ? value.join(',') : formatRange(value)}`,
  );
  return {
    locale,
    q: state.q || undefined,
    brand: state.brands.length > 0 ? state.brands : undefined,
    priceMin: state.price?.min ?? undefined,
    priceMax: state.price?.max ?? undefined,
    inStock: state.inStock || undefined,
    sale: state.sale || undefined,
    antidron: state.antidron || undefined,
    attr: attr.length > 0 ? attr : undefined,
    sort: state.sort,
    page: Math.min(state.page, MAX_PAGE),
    limit: PAGE_SIZE,
    ...scope,
  };
}

/**
 * SEO for a listing URL (§67.13): filtered views are `noindex, follow` and point canonical to the
 * unfiltered listing; sorting and tracking parameters never create a new canonical URL;
 * pagination pages are self-canonical (`?page=N`).
 */
export function listingSeo(state: ListingState): { canonicalQuery: string; indexable: boolean } {
  const filtered = activeFilterCount(state) > 0 || state.q !== '';
  if (filtered) return { canonicalQuery: '', indexable: false };
  return { canonicalQuery: state.page > 1 ? `?page=${state.page}` : '', indexable: true };
}
