import type { LocalizedCategory } from '../catalog/categories/category-tree';
import type { StockSnapshot } from '../catalog/inventory/inventory.service';
import { minPrice } from '../catalog/pricing/effective-price';
import type { PriceDto } from '../catalog/pricing/pricing.dto';
import {
  type AttributeValueRow,
  hasPriceRange,
  type ImageRow,
  toAttributes,
  toImage,
} from '../catalog/products/product-mapper';
import { translator } from '../i18n/translate';
import type { AttributeFacetValue, ProductDocument } from './product-index';

/** A `product_attribute_values` row (product- or variant-level) with the attribute's search flags. */
export interface IndexedAttributeValueRow extends AttributeValueRow {
  variantId: string | null;
  attribute: AttributeValueRow['attribute'] & { isFilterable: boolean; isSearchable: boolean };
}

/** A published product as loaded for indexing (all locales' translations, active variants only). */
export interface ProductSourceRow {
  id: string;
  slug: string;
  sku: string;
  isSale: boolean;
  isAntidron: boolean;
  publishedAt: Date | null;
  translations: {
    locale: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
  }[];
  brand: { id: string; slug: string; name: string; isActive: boolean } | null;
  /** Primary image (or the first one), at most one row. */
  media: ImageRow[];
  categories: { categoryId: string }[];
  variants: { id: string; sku: string; barcode: string | null }[];
  /** Values of the product and of all its variants; inactive variants' rows are ignored. */
  attributeValues: IndexedAttributeValueRow[];
}

/** Visible categories of one locale, indexed for ancestor lookups. */
export class CategoryLookup {
  private readonly byId: ReadonlyMap<string, LocalizedCategory>;
  private readonly byPath: ReadonlyMap<string, LocalizedCategory>;

  constructor(categories: readonly LocalizedCategory[]) {
    this.byId = new Map(categories.map((c) => [c.id, c]));
    this.byPath = new Map(categories.map((c) => [c.path, c]));
  }

  /** Visible categories among `ids` plus all their ancestors, each once, shallowest first. */
  withAncestors(ids: readonly string[]): LocalizedCategory[] {
    const found = new Map<string, LocalizedCategory>();
    for (const id of ids) {
      const category = this.byId.get(id);
      if (!category) continue;
      const segments = category.path.split('/');
      for (let i = 1; i <= segments.length; i++) {
        const ancestor = this.byPath.get(segments.slice(0, i).join('/'));
        if (ancestor) found.set(ancestor.path, ancestor);
      }
    }
    return [...found.values()].sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
  }
}

export interface DocumentContext {
  locale: string;
  /** Default locale: per-field fallback for texts (§59). */
  fallback: string;
  publicBaseUrl: string;
  prices: ReadonlyMap<string, PriceDto>;
  stock: StockSnapshot;
  categories: CategoryLookup;
}

/** The search document of one product in one locale. */
export function toProductDocument(p: ProductSourceRow, ctx: DocumentContext): ProductDocument {
  const { locale, fallback } = ctx;
  const t = translator(p.translations, locale, fallback);
  const title = t('title') ?? p.sku;
  const variantIds = p.variants.map((v) => v.id);
  const variantPrices = variantIds.map((id) => ctx.prices.get(id) ?? null);
  const price = minPrice(variantPrices);
  const stock = ctx.stock.total(variantIds);
  const categories = ctx.categories.withAncestors(p.categories.map((c) => c.categoryId));

  const active = new Set(variantIds);
  const values = p.attributeValues.filter((v) => v.variantId === null || active.has(v.variantId));
  const [image] = p.media;

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    title,
    brand: p.brand?.isActive ? { id: p.brand.id, slug: p.brand.slug, name: p.brand.name } : null,
    image: image
      ? toImage(
          {
            ...image,
            variantId: image.variantId && active.has(image.variantId) ? image.variantId : null,
          },
          ctx.publicBaseUrl,
          locale,
          fallback,
          title,
        )
      : null,
    price,
    hasPriceRange: hasPriceRange(variantPrices),
    available: stock.available,
    inStock: stock.inStock,
    isSale: p.isSale,
    isAntidron: p.isAntidron,
    variantCount: variantIds.length,

    priceAmount: price ? Number(price.amount) : null,
    publishedAt: p.publishedAt ? Math.floor(p.publishedAt.getTime() / 1000) : null,
    categories: categories.map((c) => c.path),
    warehouses: stock.warehouses.map((w) => w.code),
    attrs: facetValues(values.filter((v) => v.attribute.isFilterable)),

    variantSkus: unique(p.variants.map((v) => v.sku).filter((sku) => sku !== p.sku)),
    barcodes: unique(p.variants.flatMap((v) => (v.barcode ? [v.barcode] : []))),
    categoryNames: unique(categories.map((c) => c.name)),
    attributesText: toAttributes(
      values.filter((v) => v.attribute.isSearchable),
      locale,
      fallback,
    ).map((a) =>
      [a.name, a.values.map((v) => v.text).join(', '), a.unit].filter(Boolean).join(' '),
    ),
    shortDescription: plainText(t('shortDescription')),
    description: plainText(t('description')),
  };
}

/** Raw filter values grouped by attribute code (see `AttributeFacetValue`). */
export function facetValues(
  rows: readonly IndexedAttributeValueRow[],
): Record<string, AttributeFacetValue> {
  const groups = new Map<string, IndexedAttributeValueRow[]>();
  for (const row of rows) {
    const list = groups.get(row.attribute.code) ?? [];
    list.push(row);
    groups.set(row.attribute.code, list);
  }

  const result: Record<string, AttributeFacetValue> = {};
  for (const [code, list] of groups) {
    switch (list[0]!.attribute.type) {
      case 'SELECT':
      case 'MULTI_SELECT':
        result[code] = unique(list.flatMap((r) => (r.value ? [r.value.code] : [])));
        break;
      case 'NUMBER':
        result[code] = unique(
          list.flatMap((r) => (r.valueNumber === null ? [] : [Number(r.valueNumber)])),
        );
        break;
      case 'BOOLEAN':
        result[code] = unique(
          list.flatMap((r) => (r.valueBoolean === null ? [] : [r.valueBoolean])),
        );
        break;
      case 'RANGE': {
        const bounded = list.filter((r) => r.valueNumber !== null);
        if (bounded.length === 0) break;
        result[code] = {
          min: Math.min(...bounded.map((r) => Number(r.valueNumber))),
          max: Math.max(...bounded.map((r) => Number(r.valueNumberTo ?? r.valueNumber))),
        };
        break;
      }
      default:
        result[code] = unique(list.flatMap((r) => (r.valueText === null ? [] : [r.valueText])));
    }
    const value = result[code];
    if (Array.isArray(value) && value.length === 0) delete result[code];
  }
  return result;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Rich text → plain text for full-text search: tags dropped, common entities decoded. */
export function plainText(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e]!)
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
