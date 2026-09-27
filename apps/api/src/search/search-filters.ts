/**
 * Storefront filters → Meilisearch filter expressions (§12). Pure: no I/O, unit-tested.
 * Filters are grouped; groups are ANDed, values inside a group are ORed. Each group is also a
 * facet, and facets are disjunctive: a group's counts ignore its own selection, so choosing
 * brand A still shows how many products brand B has (see `facetQueries`).
 */

/** `attr` query value: `code:v1,v2` (options, text, `true`/`false`) or `code:min..max` (either side optional). */
export interface AttributeFilter {
  code: string;
  values?: string[];
  min?: number;
  max?: number;
}

const VALUE_LIST = /^([a-z0-9_]+):([a-z0-9_-]+(?:,[a-z0-9_-]+)*)$/;
const NUMBER = String.raw`-?\d+(?:\.\d+)?`;
/** At least one bound: `min..`, `min..max` or `..max`. */
const RANGE = new RegExp(`^([a-z0-9_]+):(?:(${NUMBER})\\.\\.(${NUMBER})?|\\.\\.(${NUMBER}))$`);

/** Accepted `attr` syntax, for DTO validation. */
export const ATTRIBUTE_FILTER_PATTERN = new RegExp(`${VALUE_LIST.source}|${RANGE.source}`);

export function parseAttributeFilter(raw: string): AttributeFilter | null {
  const list = VALUE_LIST.exec(raw);
  if (list) return { code: list[1]!, values: [...new Set(list[2]!.split(','))] };
  const range = RANGE.exec(raw);
  if (!range) return null;
  const [, code, min, max = range[4]] = range;
  return {
    code: code!,
    ...(min !== undefined && { min: Number(min) }),
    ...(max !== undefined && { max: Number(max) }),
  };
}

/** How an attribute is stored in the index (`AttributeFacetValue`) and therefore filtered. */
export type AttributeKind = 'options' | 'boolean' | 'number' | 'range';

export function attributeKind(type: string): AttributeKind {
  switch (type) {
    case 'BOOLEAN':
      return 'boolean';
    case 'NUMBER':
      return 'number';
    case 'RANGE':
      return 'range';
    default:
      return 'options'; // SELECT, MULTI_SELECT, STRING
  }
}

export interface SearchFilterInput {
  /** Visible category path; always applied (not a facet). */
  category?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  sale?: boolean;
  antidron?: boolean;
  /** Only filterable attributes known to the index; unknown codes are dropped by the caller. */
  attributes?: (AttributeFilter & { kind: AttributeKind })[];
}

/** Facet group id: `brand`, `price`, `inStock`, `sale`, `antidron` or `attr:<code>`. */
export type FilterGroup = string;

const quote = (value: string): string => JSON.stringify(value);

function rangeExpression(field: string, min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `${field} ${min} TO ${max}`;
  return min !== undefined ? `${field} >= ${min}` : `${field} <= ${max}`;
}

function attributeExpression(f: AttributeFilter & { kind: AttributeKind }): string | null {
  const field = `attrs.${f.code}`;
  switch (f.kind) {
    case 'options':
      return f.values?.length ? `${field} IN [${f.values.map(quote).join(', ')}]` : null;
    case 'boolean': {
      const flags = (f.values ?? []).filter((v) => v === 'true' || v === 'false');
      // Both values selected = no restriction.
      return flags.length === 1 ? `${field} = ${flags[0]}` : null;
    }
    case 'number':
      // `TO` matches one array element within bounds (two comparisons could match different ones).
      return f.min === undefined && f.max === undefined
        ? null
        : rangeExpression(field, f.min, f.max);
    case 'range': {
      // Overlap of the product's [min, max] with the requested bounds.
      const parts = [];
      if (f.min !== undefined) parts.push(`${field}.max >= ${f.min}`);
      if (f.max !== undefined) parts.push(`${field}.min <= ${f.max}`);
      return parts.length ? parts.join(' AND ') : null;
    }
  }
}

/** Expression of every active group, keyed by group. */
export function filterGroups(input: SearchFilterInput): Map<FilterGroup, string> {
  const groups = new Map<FilterGroup, string>();
  if (input.brands?.length) {
    groups.set('brand', `brand.slug IN [${input.brands.map(quote).join(', ')}]`);
  }
  if (input.priceMin !== undefined || input.priceMax !== undefined) {
    groups.set('price', rangeExpression('priceAmount', input.priceMin, input.priceMax));
  }
  if (input.inStock) groups.set('inStock', 'inStock = true');
  if (input.sale) groups.set('sale', 'isSale = true');
  if (input.antidron) groups.set('antidron', 'isAntidron = true');
  for (const attr of input.attributes ?? []) {
    const expression = attributeExpression(attr);
    if (expression) groups.set(`attr:${attr.code}`, expression);
  }
  return groups;
}

/** Filter array for Meilisearch (ANDed), optionally without one group. */
export function buildFilter(
  input: SearchFilterInput,
  groups: Map<FilterGroup, string>,
  without?: FilterGroup,
): string[] {
  const filter = input.category ? [`categories = ${quote(input.category)}`] : [];
  for (const [group, expression] of groups) {
    if (group !== without) filter.push(`(${expression})`);
  }
  return filter;
}

/** Index fields a group's facet reads: counts for values, `facetStats` for numbers. */
export function facetFields(
  group: FilterGroup,
  kinds: ReadonlyMap<string, AttributeKind>,
): string[] {
  switch (group) {
    case 'brand':
      return ['brand.slug'];
    case 'price':
      return ['priceAmount'];
    case 'inStock':
      return ['inStock'];
    case 'sale':
      return ['isSale'];
    case 'antidron':
      return ['isAntidron'];
  }
  const code = group.slice('attr:'.length);
  return kinds.get(code) === 'range'
    ? [`attrs.${code}.min`, `attrs.${code}.max`]
    : [`attrs.${code}`];
}

/** Every facet group shown for a listing: the fixed ones plus each filterable attribute. */
export function allFacetGroups(attributeCodes: readonly string[]): FilterGroup[] {
  return [
    'brand',
    'price',
    'inStock',
    'sale',
    'antidron',
    ...attributeCodes.map((c) => `attr:${c}`),
  ];
}

export interface FacetQuery {
  filter: string[];
  facets: string[];
  /** Groups whose facet values this query is authoritative for. */
  groups: FilterGroup[];
}

/**
 * Queries for disjunctive facets: the main query (all filters) serves every group without a
 * selection; each selected group gets its own query without its filter.
 */
export function facetQueries(
  input: SearchFilterInput,
  groups: Map<FilterGroup, string>,
  shown: readonly FilterGroup[],
  kinds: ReadonlyMap<string, AttributeKind>,
): { main: FacetQuery; disjunctive: FacetQuery[] } {
  const unselected = shown.filter((g) => !groups.has(g));
  const main = {
    filter: buildFilter(input, groups),
    facets: unselected.flatMap((g) => facetFields(g, kinds)),
    groups: unselected,
  };
  const disjunctive = shown
    .filter((g) => groups.has(g))
    .map((g) => ({
      filter: buildFilter(input, groups, g),
      facets: facetFields(g, kinds),
      groups: [g],
    }));
  return { main, disjunctive };
}
