import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  type Meilisearch,
  MeilisearchApiError,
  MeilisearchError,
  type MultiSearchQuery,
} from 'meilisearch';
import { CacheService } from '../cache/cache.service';
import { BrandsService } from '../catalog/brands/brands.service';
import { CategoriesService } from '../catalog/categories/categories.service';
import type { ProductListItemDto } from '../catalog/products/products.dto';
import { AppException, ErrorCode } from '../common/errors';
import { LocaleService } from '../i18n/locale.service';
import { PrismaService } from '../prisma/prisma.service';
import { DISPLAYED_ATTRIBUTES, type ProductDocument } from './product-index';
import { MEILI, ProductIndexService } from './product-index.service';
import { buildFacets, type FacetAttributeMeta, type FacetResults } from './search-facets';
import {
  allFacetGroups,
  attributeKind,
  type AttributeKind,
  facetQueries,
  filterGroups,
  parseAttributeFilter,
  type SearchFilterInput,
} from './search-filters';
import {
  MAX_SEARCH_DEPTH,
  type SearchQueryDto,
  type SearchResultDto,
  type SearchSort,
  type SuggestQueryDto,
  type SuggestResultDto,
} from './search.dto';

const SORT: Record<SearchSort, string[] | undefined> = {
  relevance: undefined,
  price_asc: ['priceAmount:asc'],
  price_desc: ['priceAmount:desc'],
  newest: ['publishedAt:desc'],
  title: ['title:asc'],
};

const FACET_ATTRIBUTES_KEY = 'search:facet-attributes';
/** Attribute definitions change only in the admin, which calls `invalidateFacetCache()`. */
const FACET_ATTRIBUTES_TTL_SECONDS = 10 * 60;
const SUGGEST_GROUP_SIZE = 5;

/**
 * Storefront search and faceted browsing (§12) over the product indexes. Read-only: indexing is
 * `SearchIndexProcessor`'s job. When Meilisearch is unreachable the API answers 503
 * `SERVICE_UNAVAILABLE`; category listings fall back to SQL (7.4).
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(MEILI) private readonly meili: Meilisearch,
    private readonly indexes: ProductIndexService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly locales: LocaleService,
    private readonly categories: CategoriesService,
    private readonly brands: BrandsService,
  ) {}

  async search(locale: string, query: SearchQueryDto): Promise<SearchResultDto> {
    if (query.page * query.limit > MAX_SEARCH_DEPTH) {
      throw badRequest(`page × limit must not exceed ${MAX_SEARCH_DEPTH}; narrow the filters`);
    }
    if (
      query.priceMin !== undefined &&
      query.priceMax !== undefined &&
      query.priceMin > query.priceMax
    ) {
      throw badRequest('priceMin must not exceed priceMax');
    }
    if (query.category && !(await this.isVisibleCategory(locale, query.category))) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Category not found', HttpStatus.NOT_FOUND);
    }

    const [attributes, { defaultLocale }] = await Promise.all([
      this.facetAttributes(),
      this.locales.settings(),
    ]);
    const kinds = new Map<string, AttributeKind>(
      attributes.map((a) => [a.code, attributeKind(a.type)]),
    );
    const input: SearchFilterInput = {
      category: query.category,
      brands: query.brand ? [...new Set(query.brand)] : undefined,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      inStock: query.inStock,
      sale: query.sale,
      antidron: query.antidron,
      attributes: (query.attr ?? [])
        .map(parseAttributeFilter)
        .flatMap((f) => (f && kinds.has(f.code) ? [{ ...f, kind: kinds.get(f.code)! }] : [])),
    };
    const groups = filterGroups(input);
    const { main, disjunctive } = facetQueries(
      input,
      groups,
      allFacetGroups(attributes.map((a) => a.code)),
      kinds,
    );

    const q = query.q?.trim() ?? '';
    const indexUid = this.indexes.uid(locale);
    const { results } = await this.call(() =>
      this.meili.multiSearch<{ queries: MultiSearchQuery[] }, ProductDocument>({
        queries: [
          {
            indexUid,
            q,
            filter: main.filter,
            facets: main.facets,
            sort: SORT[query.sort],
            page: query.page,
            hitsPerPage: query.limit,
          },
          ...disjunctive.map((d) => ({
            indexUid,
            q,
            filter: d.filter,
            facets: d.facets,
            limit: 0,
          })),
        ],
      }),
    );

    const [first] = results;
    const facetData: FacetResults = { distribution: {}, stats: {} };
    for (const r of results) {
      Object.assign(facetData.distribution, r.facetDistribution);
      Object.assign(facetData.stats, r.facetStats);
    }
    const brandNames = await this.brandNames(locale, facetData.distribution['brand.slug']);
    const total = first?.totalHits ?? 0;

    return {
      locale,
      query: q,
      items: (first?.hits ?? []).map(toListItem),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      facets: buildFacets({
        locale,
        fallback: defaultLocale,
        input,
        results: facetData,
        attributes,
        brandNames,
      }),
    };
  }

  /** As-you-type: top products (prefix search) plus matching categories and brands. */
  async suggest(locale: string, query: SuggestQueryDto): Promise<SuggestResultDto> {
    const q = query.q.trim();
    const rank = nameMatchRank(q, locale);

    const [products, categories, brands] = await Promise.all([
      this.call(() =>
        this.meili
          .index<ProductDocument>(this.indexes.uid(locale))
          .search(q, { limit: query.limit }),
      ),
      this.categories.localized(locale),
      this.brands.list(locale),
    ]);

    return {
      locale,
      query: q,
      products: products.hits.map(toListItem),
      categories: bestMatches(
        categories,
        (c) => rank(c.name),
        (a, b) => a.depth - b.depth,
      ).map((c) => ({ path: c.path, name: c.name })),
      // Brands arrive sorted by name, which the stable sort keeps within a rank.
      brands: bestMatches(brands.items, (b) => rank(b.name)).map((b) => ({
        slug: b.slug,
        name: b.name,
      })),
    };
  }

  /** Call after changing attributes, their options or translations (admin 10.4). */
  async invalidateFacetCache(): Promise<void> {
    await this.cache.del([FACET_ATTRIBUTES_KEY]);
  }

  private facetAttributes(): Promise<FacetAttributeMeta[]> {
    return this.cache.getOrSet(FACET_ATTRIBUTES_KEY, FACET_ATTRIBUTES_TTL_SECONDS, () =>
      this.prisma.attribute.findMany({
        where: { isFilterable: true },
        orderBy: [{ position: 'asc' }, { code: 'asc' }],
        select: {
          code: true,
          type: true,
          translations: { select: { locale: true, name: true, unit: true } },
          values: {
            orderBy: [{ position: 'asc' }, { code: 'asc' }],
            select: { code: true, translations: { select: { locale: true, label: true } } },
          },
        },
      }),
    );
  }

  private async isVisibleCategory(locale: string, path: string): Promise<boolean> {
    return (await this.categories.localized(locale)).some((c) => c.path === path);
  }

  /** Names of the brands in a facet; brands without published products fall back to the slug. */
  private async brandNames(
    locale: string,
    distribution: Record<string, number> | undefined,
  ): Promise<Map<string, string>> {
    if (!distribution) return new Map();
    const { items } = await this.brands.list(locale);
    return new Map(items.map((b) => [b.slug, b.name]));
  }

  /** Meilisearch down or index not built yet → 503; anything else is a bug → 500. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const unavailable =
        err instanceof MeilisearchError &&
        (!(err instanceof MeilisearchApiError) || err.cause?.code === 'index_not_found');
      if (!unavailable) throw err;
      this.logger.warn(`Search unavailable: ${(err as Error).message}`);
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Search is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

/** A search hit is exactly the listing tile (`DISPLAYED_ATTRIBUTES`). */
function toListItem(hit: Partial<ProductDocument>): ProductListItemDto {
  return Object.fromEntries(
    DISPLAYED_ATTRIBUTES.map((key) => [key, hit[key]]),
  ) as unknown as ProductListItemDto;
}

/**
 * How well a name matches typed text: 0 = name starts with it, 1 = a word starts with it,
 * 2 = contained (compound words: «Електроточила» for «точ»), `null` = no match.
 */
export function nameMatchRank(q: string, locale: string): (name: string) => number | null {
  const needle = q.toLocaleLowerCase(locale);
  return (name) => {
    if (!needle) return null;
    const text = name.toLocaleLowerCase(locale);
    if (text.startsWith(needle)) return 0;
    if (text.split(/[\s\-/]+/).some((word) => word.startsWith(needle))) return 1;
    return text.includes(needle) ? 2 : null;
  };
}

function bestMatches<T>(
  items: readonly T[],
  rank: (item: T) => number | null,
  tieBreak: (a: T, b: T) => number = () => 0,
): T[] {
  return items
    .flatMap((item) => {
      const r = rank(item);
      return r === null ? [] : [{ item, r }];
    })
    .sort((a, b) => a.r - b.r || tieBreak(a.item, b.item))
    .slice(0, SUGGEST_GROUP_SIZE)
    .map((m) => m.item);
}

function badRequest(message: string): AppException {
  return new AppException(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST);
}
