import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { ProductListItemDto } from '../catalog/products/products.dto';
import { LocaleQueryDto } from '../i18n/locale-query.dto';
import { ATTRIBUTE_FILTER_PATTERN } from './search-filters';

const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Repeated query parameter (`?a=1&a=2`) or a single one → array. */
const toArray = ({ value }: TransformFnParams): unknown =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

/** Like `toArray`, also splitting comma-separated values (`?brand=a,b`). */
const toList = (params: TransformFnParams): unknown => {
  const list = toArray(params);
  return Array.isArray(list) ? list.flatMap((v) => String(v).split(',')).filter(Boolean) : list;
};

export const SEARCH_SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'title'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/** Deepest reachable result (index `maxTotalHits`). */
export const MAX_SEARCH_DEPTH = 10_000;

export class SearchQueryDto extends LocaleQueryDto {
  /** Full-text query; empty = browse (e.g. a category page). Typos and prefixes are tolerated. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /**
   * Category slug path; includes all subcategories.
   * @example zbroia/vohnepalna-zbroia
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, { message: 'category must be slugs separated by /' })
  category?: string;

  /** Brand slugs (any of): `?brand=a&brand=b` or `?brand=a,b`. */
  @IsOptional()
  @Transform(toList)
  @ArrayMaxSize(50)
  @MaxLength(200, { each: true })
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { each: true, message: 'brand must be a slug' })
  brand?: string[];

  /** Lowest selling price, UAH. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMin?: number;

  /** Highest selling price, UAH. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMax?: number;

  /** Only products available to buy now. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  inStock?: boolean;

  /** Only products of the `/sale` showcase. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  sale?: boolean;

  /** Only products of the `/antidron` showcase. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  antidron?: boolean;

  /**
   * Attribute filters, repeatable; ANDed across attributes, ORed inside one:
   * `code:v1,v2` (option codes, text, `true`/`false`) or `code:min..max` (numbers, either side
   * optional). Unknown or non-filterable codes are ignored.
   * @example ["calibre:12-70,20-76", "barrel_length:600..760"]
   */
  @IsOptional()
  @Transform(toArray)
  @ArrayMaxSize(30)
  @MaxLength(500, { each: true })
  @Matches(ATTRIBUTE_FILTER_PATTERN, {
    each: true,
    message: 'attr must be code:v1,v2 or code:min..max',
  })
  attr?: string[];

  /** `relevance` (default; in stock first, then newest when there is no query). */
  @IsOptional()
  @IsIn(SEARCH_SORTS)
  sort: SearchSort = 'relevance';

  /** 1-based page number; `page × limit` ≤ 10 000. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SEARCH_DEPTH)
  page: number = 1;

  /** Page size. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 24;
}

export class FacetValueDto {
  /** Value to send back in the filter: brand slug, option code, `true`/`false` or text. */
  value: string;
  /** Display text in the response locale. */
  label: string;
  /** Matching products with every other filter applied (disjunctive). */
  count: number;
  selected: boolean;
}

export class NumberRangeDto {
  min: number;
  max: number;
}

export class SelectedRangeDto {
  min: number | null;
  max: number | null;
}

export class ToggleFacetDto {
  /** Products that would match with this toggle on. */
  count: number;
  selected: boolean;
}

export class AttributeFacetDto {
  code: string;
  name: string;
  unit: string | null;
  /** `SELECT`, `MULTI_SELECT`, `STRING`, `BOOLEAN` → `values`; `NUMBER`, `RANGE` → `range`. */
  type: string;
  /** Options with counts, in the attribute's option order. */
  values: FacetValueDto[];
  /** Bounds for a slider: over products matching every other filter. */
  range: NumberRangeDto | null;
  selectedRange: SelectedRangeDto | null;
}

export class SearchFacetsDto {
  brands: FacetValueDto[];
  /** Selling-price bounds over products matching every other filter. */
  price: NumberRangeDto | null;
  selectedPrice: SelectedRangeDto | null;
  inStock: ToggleFacetDto;
  sale: ToggleFacetDto;
  antidron: ToggleFacetDto;
  /** Filterable attributes that have values among the matching products (or are selected). */
  attributes: AttributeFacetDto[];
}

export class SearchResultDto {
  locale: string;
  query: string;
  items: ProductListItemDto[];
  page: number;
  limit: number;
  /** Exact up to 10 000. */
  total: number;
  totalPages: number;
  facets: SearchFacetsDto;
}

export class SuggestQueryDto extends LocaleQueryDto {
  /** What the user has typed so far (prefix of the last word is enough). */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;

  /** Products to return. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 6;
}

export class SuggestCategoryDto {
  path: string;
  name: string;
}

export class SuggestBrandDto {
  slug: string;
  name: string;
}

export class SuggestResultDto {
  locale: string;
  query: string;
  products: ProductListItemDto[];
  /** Up to 5 visible categories whose name contains the query. */
  categories: SuggestCategoryDto[];
  /** Up to 5 brands (with products) whose name contains the query. */
  brands: SuggestBrandDto[];
}
