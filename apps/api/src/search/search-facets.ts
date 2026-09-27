import { BOOLEAN_TEXT } from '../catalog/products/product-mapper';
import { translator } from '../i18n/translate';
import { attributeKind, type SearchFilterInput } from './search-filters';
import type {
  AttributeFacetDto,
  FacetValueDto,
  NumberRangeDto,
  SearchFacetsDto,
  SelectedRangeDto,
} from './search.dto';

/** A filterable attribute with all translations and options (cached, localized per request). */
export interface FacetAttributeMeta {
  code: string;
  type: string;
  translations: { locale: string; name: string; unit: string | null }[];
  values: { code: string; translations: { locale: string; label: string }[] }[];
}

/** Facet data of all queries of one search, merged (each field comes from exactly one query). */
export interface FacetResults {
  distribution: Record<string, Record<string, number>>;
  stats: Record<string, { min: number; max: number }>;
}

export interface FacetContext {
  locale: string;
  fallback: string;
  input: SearchFilterInput;
  results: FacetResults;
  /** Filterable attributes in display order. */
  attributes: readonly FacetAttributeMeta[];
  brandNames: ReadonlyMap<string, string>;
}

const byCountThenLabel = (a: FacetValueDto, b: FacetValueDto): number =>
  b.count - a.count || a.label.localeCompare(b.label);

/**
 * Facet counts for the storefront filter panel. Selected values are always listed (count may be
 * 0) so they can be unselected; empty unselected facets are omitted.
 */
export function buildFacets(ctx: FacetContext): SearchFacetsDto {
  const { input, results } = ctx;
  const toggle = (field: string, selected = false) => ({
    count: results.distribution[field]?.true ?? 0,
    selected,
  });

  return {
    brands: values(
      results.distribution['brand.slug'],
      input.brands ?? [],
      (slug) => ctx.brandNames.get(slug) ?? slug,
    ).sort(byCountThenLabel),
    price: range(results.stats.priceAmount),
    selectedPrice: selectedRange(input.priceMin, input.priceMax),
    inStock: toggle('inStock', input.inStock),
    sale: toggle('isSale', input.sale),
    antidron: toggle('isAntidron', input.antidron),
    attributes: ctx.attributes
      .map((meta) => attributeFacet(meta, ctx))
      .filter((f): f is AttributeFacetDto => f !== null),
  };
}

function attributeFacet(meta: FacetAttributeMeta, ctx: FacetContext): AttributeFacetDto | null {
  const t = translator(meta.translations, ctx.locale, ctx.fallback);
  const selected = ctx.input.attributes?.find((a) => a.code === meta.code);
  const base = { code: meta.code, name: t('name') ?? meta.code, unit: t('unit'), type: meta.type };
  const field = `attrs.${meta.code}`;

  switch (attributeKind(meta.type)) {
    case 'number':
    case 'range': {
      const stats =
        meta.type === 'RANGE'
          ? merge(ctx.results.stats[`${field}.min`], ctx.results.stats[`${field}.max`])
          : ctx.results.stats[field];
      const chosen = selected ? selectedRange(selected.min, selected.max) : null;
      if (!stats && !chosen) return null;
      return { ...base, values: [], range: range(stats), selectedRange: chosen };
    }
    case 'boolean': {
      const [yes, no] = BOOLEAN_TEXT[ctx.locale] ?? BOOLEAN_TEXT.uk!;
      const list = values(ctx.results.distribution[field], selected?.values ?? [], (v) =>
        v === 'true' ? yes : no,
      ).sort((a, b) => b.value.localeCompare(a.value)); // true first
      return list.length ? { ...base, values: list, range: null, selectedRange: null } : null;
    }
    case 'options': {
      // Options keep the attribute's own order; free text (STRING) is ordered by count.
      const order = new Map(meta.values.map((v, i) => [v.code, i]));
      const labels = new Map(
        meta.values.map((v) => [
          v.code,
          translator(v.translations, ctx.locale, ctx.fallback)('label') ?? v.code,
        ]),
      );
      const list = values(
        ctx.results.distribution[field],
        selected?.values ?? [],
        (v) => labels.get(v) ?? v,
      ).sort((a, b) =>
        order.size
          ? (order.get(a.value) ?? Infinity) - (order.get(b.value) ?? Infinity) ||
            byCountThenLabel(a, b)
          : byCountThenLabel(a, b),
      );
      return list.length ? { ...base, values: list, range: null, selectedRange: null } : null;
    }
  }
}

function values(
  distribution: Record<string, number> | undefined,
  selected: readonly string[],
  label: (value: string) => string,
): FacetValueDto[] {
  const counts = new Map(Object.entries(distribution ?? {}));
  for (const value of selected) if (!counts.has(value)) counts.set(value, 0);
  return [...counts].map(([value, count]) => ({
    value,
    label: label(value),
    count,
    selected: selected.includes(value),
  }));
}

function range(stats: { min: number; max: number } | undefined): NumberRangeDto | null {
  return stats ? { min: stats.min, max: stats.max } : null;
}

function merge(
  low: { min: number } | undefined,
  high: { max: number } | undefined,
): { min: number; max: number } | undefined {
  return low && high ? { min: low.min, max: high.max } : undefined;
}

function selectedRange(min?: number, max?: number): SelectedRangeDto | null {
  return min === undefined && max === undefined ? null : { min: min ?? null, max: max ?? null };
}
