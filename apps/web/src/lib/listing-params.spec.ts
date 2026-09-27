import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  clearFilters,
  EMPTY_LISTING,
  listingHref,
  listingSeo,
  MAX_PAGE,
  PAGE_SIZE,
  paginationRange,
  parseListingParams,
  pruneUnknownAttrs,
  serializeListingParams,
  setAttrRange,
  setPrice,
  toggleAttrValue,
  toggleBrand,
  toggleFlag,
  toSearchQuery,
  withPage,
  withSort,
} from './listing-params';

describe('parseListingParams', () => {
  it('parses every filter group', () => {
    const state = parseListingParams({
      brand: 'sauer,blaser',
      price: '10000..50000',
      caliber: '308-win,12-70',
      barrel_length: '..600',
      in_stock: '1',
      sale: 'true',
      sort: 'price_asc',
      page: '3',
    });
    expect(state).toEqual({
      ...EMPTY_LISTING,
      brands: ['blaser', 'sauer'],
      price: { min: 10000, max: 50000 },
      attrs: { barrel_length: { min: null, max: 600 }, caliber: ['12-70', '308-win'] },
      inStock: true,
      sale: true,
      sort: 'price_asc',
      page: 3,
    });
  });

  it('joins repeated keys and removes duplicates', () => {
    expect(parseListingParams({ brand: ['a,b', 'a'] }).brands).toEqual(['a', 'b']);
  });

  it('drops invalid values instead of failing', () => {
    const state = parseListingParams({
      price: 'cheap',
      sort: 'random',
      page: '-2',
      in_stock: 'yes',
      caliber: '',
      'Bad-Key': 'x',
    });
    expect(state).toEqual(EMPTY_LISTING);
    expect(parseListingParams({ page: '1.5' }).page).toBe(1);
    expect(parseListingParams({ price: '..' }).price).toBeNull();
  });

  it('swaps reversed range bounds', () => {
    expect(parseListingParams({ price: '500..100' }).price).toEqual({ min: 100, max: 500 });
  });

  it('ignores tracking parameters', () => {
    const state = parseListingParams({ utm_source: 'google', gclid: 'abc', fbclid: 'x' });
    expect(state.attrs).toEqual({});
  });
});

describe('serializeListingParams', () => {
  it('omits defaults', () => {
    expect(serializeListingParams(EMPTY_LISTING)).toBe('');
  });

  it('uses a stable key order and keeps commas readable', () => {
    const query = '?brand=a,b&price=..500&caliber=12-70&weight=1..2&in_stock=1&sort=newest&page=2';
    const state = parseListingParams(Object.fromEntries(new URLSearchParams(query)));
    expect(serializeListingParams(state)).toBe(query);
  });

  it('encodes unsafe characters', () => {
    expect(serializeListingParams({ ...EMPTY_LISTING, q: 'ніж & ліхтар' })).toBe(
      `?q=${encodeURIComponent('ніж & ліхтар')}`,
    );
  });
});

describe('editing', () => {
  const page3 = { ...EMPTY_LISTING, page: 3 };

  it('toggles brands and attribute values, resetting the page', () => {
    const on = toggleBrand(page3, 'sauer');
    expect(on).toMatchObject({ brands: ['sauer'], page: 1 });
    expect(toggleBrand(on, 'sauer').brands).toEqual([]);

    const attr = toggleAttrValue(page3, 'caliber', '12-70');
    expect(attr.attrs).toEqual({ caliber: ['12-70'] });
    expect(toggleAttrValue(attr, 'caliber', '12-70').attrs).toEqual({});
  });

  it('sets and clears ranges', () => {
    expect(setPrice(page3, { min: 100, max: null })).toMatchObject({
      price: { min: 100, max: null },
      page: 1,
    });
    expect(setPrice(page3, { min: null, max: null }).price).toBeNull();
    expect(setPrice(page3, { min: Number.NaN, max: 5 }).price).toEqual({ min: null, max: 5 });
    const ranged = setAttrRange(page3, 'weight', { min: 2, max: 1 });
    expect(ranged.attrs).toEqual({ weight: { min: 1, max: 2 } });
    expect(setAttrRange(ranged, 'weight', null).attrs).toEqual({});
  });

  it('toggles flags; clearing keeps the query and sort', () => {
    const state = toggleFlag({ ...page3, q: 'ніж', sort: 'newest', brands: ['a'] }, 'inStock');
    expect(state).toMatchObject({ inStock: true, page: 1 });
    expect(clearFilters(state)).toEqual({ ...EMPTY_LISTING, q: 'ніж', sort: 'newest' });
  });

  it('changing the sort resets the page; paging keeps filters', () => {
    expect(withSort(page3, 'title')).toMatchObject({ sort: 'title', page: 1 });
    expect(withPage({ ...EMPTY_LISTING, brands: ['a'] }, 4)).toMatchObject({
      brands: ['a'],
      page: 4,
    });
  });

  it('builds hrefs', () => {
    expect(listingHref('/category/zbroia', toggleBrand(EMPTY_LISTING, 'sauer'))).toBe(
      '/category/zbroia?brand=sauer',
    );
  });
});

describe('queries', () => {
  const filtered = parseListingParams({
    brand: 'a',
    price: '1..',
    caliber: '12-70',
    old_attr: 'x',
    in_stock: '1',
  });

  it('counts applied filters', () => {
    expect(activeFilterCount(EMPTY_LISTING)).toBe(0);
    expect(activeFilterCount(filtered)).toBe(5);
  });

  it('prunes unknown attribute codes', () => {
    expect(pruneUnknownAttrs(filtered, ['caliber']).attrs).toEqual({ caliber: ['12-70'] });
  });

  it('maps state to the search API query with the page scope', () => {
    expect(toSearchQuery({ ...filtered, page: 9999 }, { category: 'zbroia' }, 'ru')).toEqual({
      locale: 'ru',
      q: undefined,
      brand: ['a'],
      priceMin: 1,
      priceMax: undefined,
      inStock: true,
      sale: undefined,
      antidron: undefined,
      attr: ['caliber:12-70', 'old_attr:x'],
      sort: 'relevance',
      page: MAX_PAGE,
      limit: PAGE_SIZE,
      category: 'zbroia',
    });
    expect(toSearchQuery(parseListingParams({ weight: '..5' }), {}, 'uk').attr).toEqual([
      'weight:..5',
    ]);
  });
});

describe('listingSeo', () => {
  it('indexes the plain listing and its pages, ignoring the sort', () => {
    expect(listingSeo(EMPTY_LISTING)).toEqual({ canonicalQuery: '', indexable: true });
    expect(listingSeo({ ...EMPTY_LISTING, sort: 'price_asc', page: 2 })).toEqual({
      canonicalQuery: '?page=2',
      indexable: true,
    });
  });

  it('does not index filtered views or text searches', () => {
    expect(listingSeo({ ...EMPTY_LISTING, inStock: true, page: 2 })).toEqual({
      canonicalQuery: '',
      indexable: false,
    });
    expect(listingSeo({ ...EMPTY_LISTING, q: 'ніж' }).indexable).toBe(false);
  });
});

describe('paginationRange', () => {
  it('shows every page when there are few', () => {
    expect(paginationRange(1, 1)).toEqual([1]);
    expect(paginationRange(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses distant pages into gaps', () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, null, 20]);
    expect(paginationRange(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(paginationRange(20, 20)).toEqual([1, null, 19, 20]);
  });

  it('never hides a single page behind a gap', () => {
    expect(paginationRange(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
    expect(paginationRange(17, 20)).toEqual([1, null, 16, 17, 18, 19, 20]);
  });
});
