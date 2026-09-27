import { describe, expect, it } from 'vitest';
import { buildFacets, type FacetAttributeMeta } from './search-facets';
import { nameMatchRank } from './search.service';
import {
  ATTRIBUTE_FILTER_PATTERN,
  type AttributeKind,
  buildFilter,
  facetQueries,
  filterGroups,
  parseAttributeFilter,
  type SearchFilterInput,
} from './search-filters';

describe('parseAttributeFilter', () => {
  it('parses option lists and ranges', () => {
    expect(parseAttributeFilter('calibre:12-70,20-76,12-70')).toEqual({
      code: 'calibre',
      values: ['12-70', '20-76'],
    });
    expect(parseAttributeFilter('length:90.5..120')).toEqual({
      code: 'length',
      min: 90.5,
      max: 120,
    });
    expect(parseAttributeFilter('temp:-20..')).toEqual({ code: 'temp', min: -20 });
    expect(parseAttributeFilter('temp:..5')).toEqual({ code: 'temp', max: 5 });
  });

  it('rejects malformed values', () => {
    for (const raw of ['calibre', 'calibre:', 'x:..', 'x:1..2..3', 'X:a', 'x:a b', 'x:"a"']) {
      expect(parseAttributeFilter(raw)).toBeNull();
      expect(ATTRIBUTE_FILTER_PATTERN.test(raw)).toBe(false);
    }
  });
});

describe('filterGroups / buildFilter', () => {
  const input: SearchFilterInput = {
    category: 'zbroia',
    brands: ['beretta', 'benelli'],
    priceMin: 1000,
    inStock: true,
    sale: true,
    attributes: [
      { code: 'calibre', values: ['12-70'], kind: 'options' },
      { code: 'waterproof', values: ['true'], kind: 'boolean' },
      { code: 'wet', values: ['true', 'false'], kind: 'boolean' },
      { code: 'length', min: 90, max: 120, kind: 'number' },
      { code: 'temp', min: -20, kind: 'range' },
      { code: 'empty', kind: 'number' },
    ],
  };

  it('builds one expression per group; no-op selections are skipped', () => {
    expect(Object.fromEntries(filterGroups(input))).toEqual({
      brand: 'brand.slug IN ["beretta", "benelli"]',
      price: 'priceAmount >= 1000',
      inStock: 'inStock = true',
      sale: 'isSale = true',
      'attr:calibre': 'attrs.calibre IN ["12-70"]',
      'attr:waterproof': 'attrs.waterproof = true',
      'attr:length': 'attrs.length 90 TO 120',
      'attr:temp': 'attrs.temp.max >= -20',
    });
  });

  it('always keeps the category and can leave one group out', () => {
    const groups = filterGroups(input);
    const filter = buildFilter(input, groups, 'brand');
    expect(filter[0]).toBe('categories = "zbroia"');
    expect(filter.join(' ')).not.toContain('brand.slug');
    expect(filter).toHaveLength(groups.size);
  });

  it('builds a range overlap for RANGE attributes', () => {
    const groups = filterGroups({ attributes: [{ code: 't', min: 1, max: 5, kind: 'range' }] });
    expect(groups.get('attr:t')).toBe('attrs.t.max >= 1 AND attrs.t.min <= 5');
  });
});

describe('facetQueries', () => {
  const kinds = new Map<string, AttributeKind>([
    ['calibre', 'options'],
    ['temp', 'range'],
  ]);

  it('lets each selected group count without its own filter (disjunctive facets)', () => {
    const input: SearchFilterInput = {
      brands: ['beretta'],
      attributes: [{ code: 'calibre', values: ['12-70'], kind: 'options' }],
    };
    const groups = filterGroups(input);
    const { main, disjunctive } = facetQueries(
      input,
      groups,
      ['brand', 'price', 'attr:calibre', 'attr:temp'],
      kinds,
    );

    expect(main.facets).toEqual(['priceAmount', 'attrs.temp.min', 'attrs.temp.max']);
    expect(main.filter).toHaveLength(2);
    expect(disjunctive).toEqual([
      { filter: ['(attrs.calibre IN ["12-70"])'], facets: ['brand.slug'], groups: ['brand'] },
      {
        filter: ['(brand.slug IN ["beretta"])'],
        facets: ['attrs.calibre'],
        groups: ['attr:calibre'],
      },
    ]);
  });
});

describe('buildFacets', () => {
  const calibre: FacetAttributeMeta = {
    code: 'calibre',
    type: 'SELECT',
    translations: [
      { locale: 'uk', name: 'Калібр', unit: null },
      { locale: 'en', name: 'Calibre', unit: null },
    ],
    values: [
      { code: '12-70', translations: [{ locale: 'uk', label: '12/70' }] },
      { code: '20-76', translations: [{ locale: 'uk', label: '20/76' }] },
    ],
  };
  const length: FacetAttributeMeta = {
    code: 'length',
    type: 'NUMBER',
    translations: [{ locale: 'uk', name: 'Довжина', unit: 'мм' }],
    values: [],
  };
  const waterproof: FacetAttributeMeta = {
    code: 'waterproof',
    type: 'BOOLEAN',
    translations: [{ locale: 'uk', name: 'Водонепроникний', unit: null }],
    values: [],
  };

  it('labels values, keeps option order and lists selected values even with no matches', () => {
    const facets = buildFacets({
      locale: 'en',
      fallback: 'uk',
      input: {
        brands: ['gone'],
        inStock: true,
        attributes: [{ code: 'length', min: 100, kind: 'number' }],
      },
      results: {
        distribution: {
          'brand.slug': { beretta: 2, benelli: 5 },
          inStock: { true: 4, false: 3 },
          isSale: { false: 7 },
          'attrs.calibre': { '20-76': 5, '12-70': 1 },
          'attrs.waterproof': { false: 1, true: 2 },
        },
        stats: { priceAmount: { min: 100, max: 900 }, 'attrs.length': { min: 60, max: 140 } },
      },
      attributes: [calibre, length, waterproof],
      brandNames: new Map([
        ['beretta', 'Beretta'],
        ['benelli', 'Benelli'],
      ]),
    });

    expect(facets.brands).toEqual([
      { value: 'benelli', label: 'Benelli', count: 5, selected: false },
      { value: 'beretta', label: 'Beretta', count: 2, selected: false },
      { value: 'gone', label: 'gone', count: 0, selected: true },
    ]);
    expect(facets.price).toEqual({ min: 100, max: 900 });
    expect(facets.selectedPrice).toBeNull();
    expect(facets.inStock).toEqual({ count: 4, selected: true });
    expect(facets.sale).toEqual({ count: 0, selected: false });
    expect(facets.attributes).toEqual([
      {
        code: 'calibre',
        name: 'Calibre',
        unit: null,
        type: 'SELECT',
        values: [
          { value: '12-70', label: '12/70', count: 1, selected: false },
          { value: '20-76', label: '20/76', count: 5, selected: false },
        ],
        range: null,
        selectedRange: null,
      },
      {
        code: 'length',
        name: 'Довжина',
        unit: 'мм',
        type: 'NUMBER',
        values: [],
        range: { min: 60, max: 140 },
        selectedRange: { min: 100, max: null },
      },
      {
        code: 'waterproof',
        name: 'Водонепроникний',
        unit: null,
        type: 'BOOLEAN',
        values: [
          { value: 'true', label: 'Yes', count: 2, selected: false },
          { value: 'false', label: 'No', count: 1, selected: false },
        ],
        range: null,
        selectedRange: null,
      },
    ]);
  });

  it('omits attributes with nothing to show', () => {
    const facets = buildFacets({
      locale: 'uk',
      fallback: 'uk',
      input: {},
      results: { distribution: {}, stats: {} },
      attributes: [calibre, length],
      brandNames: new Map(),
    });
    expect(facets.attributes).toEqual([]);
    expect(facets.price).toBeNull();
  });
});

describe('nameMatchRank', () => {
  it('prefers the name start, then a word start, then a substring', () => {
    const rank = nameMatchRank('ber', 'uk');
    expect(rank('Beretta')).toBe(0);
    expect(rank('Cavernous Beret')).toBe(1);
    expect(rank('Rubbery Topsail')).toBe(2);
    expect(rank('Buck')).toBeNull();
    expect(nameMatchRank('точ', 'uk')('Електроточила')).toBe(2);
    expect(nameMatchRank('', 'uk')('Beretta')).toBeNull();
  });
});
