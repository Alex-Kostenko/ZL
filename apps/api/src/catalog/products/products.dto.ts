import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LocaleQueryDto } from '../../i18n/locale-query.dto';
import type { BreadcrumbDto } from '../categories/categories.dto';
import type { StockDto } from '../inventory/inventory.dto';
import type { PriceDto } from '../pricing/pricing.dto';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Query flags arrive as strings; anything but `true`/`false` stays as is and fails validation. */
const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ProductImageDto {
  url: string;
  width: number | null;
  height: number | null;
  /** Alt text in the response locale; the product title when none is set. */
  alt: string;
  /** Set when the image shows one variant (e.g. a colour). */
  variantId: string | null;
}

export class ProductBrandDto {
  id: string;
  slug: string;
  name: string;
}

export class ProductCategoryRefDto {
  id: string;
  path: string;
  name: string;
}

/** Listing tile: enough for a product card in a grid. */
export class ProductListItemDto {
  id: string;
  slug: string;
  sku: string;
  title: string;
  brand: ProductBrandDto | null;
  /** Primary image (or the first one). */
  image: ProductImageDto | null;
  /** Lowest current price among active variants; `null` when none is priced. */
  price: PriceDto | null;
  /** Variants differ in price: show the price as "from". */
  hasPriceRange: boolean;
  /** Sum over active variants and active warehouses. */
  available: number;
  inStock: boolean;
  isSale: boolean;
  isAntidron: boolean;
  variantCount: number;
}

export class ProductListDto {
  locale: string;
  items: ProductListItemDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ProductListQueryDto extends LocaleQueryDto {
  /** 1-based page number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page: number = 1;

  /** Page size. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 24;

  /**
   * Category slug path; includes products of all its subcategories.
   * @example zbroia/vohnepalna-zbroia
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, { message: 'category must be slugs separated by /' })
  category?: string;

  /** Brand slug. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SLUG, { message: 'brand must be a slug' })
  brand?: string;

  /** Only products flagged for the `/sale` showcase. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  sale?: boolean;

  /** Only products flagged for the `/antidron` showcase. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  antidron?: boolean;
}

export class ProductSlugParamDto {
  @IsString()
  @MaxLength(255)
  @Matches(SLUG, { message: 'slug must be a slug' })
  slug: string;
}

export class AttributeValueDto {
  /** Display text in the response locale, e.g. `12 кал.`, `3–9`, `Так`. Units are separate. */
  text: string;
  /** Option code for SELECT / MULTI_SELECT (used in filter URLs). */
  code: string | null;
}

export class ProductAttributeDto {
  code: string;
  name: string;
  /** Localized unit, e.g. `мм`. */
  unit: string | null;
  /** STRING, NUMBER, BOOLEAN, SELECT, MULTI_SELECT or RANGE. */
  type: string;
  /** Several only for MULTI_SELECT. */
  values: AttributeValueDto[];
}

export class ProductVariantDto {
  id: string;
  sku: string;
  barcode: string | null;
  /** Variant-distinguishing characteristics (calibre, size, colour). */
  options: ProductAttributeDto[];
  price: PriceDto | null;
  stock: StockDto;
}

/** Product page. */
export class ProductDetailDto {
  locale: string;
  id: string;
  slug: string;
  sku: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  brand: ProductBrandDto | null;
  /** Primary category (canonical URL, breadcrumbs); `null` when it is hidden. */
  category: ProductCategoryRefDto | null;
  /** Root → primary category. */
  breadcrumbs: BreadcrumbDto[];
  images: ProductImageDto[];
  /** Product-level characteristics, in display order. */
  attributes: ProductAttributeDto[];
  /** Active variants, in display order. */
  variants: ProductVariantDto[];
  /** Lowest current variant price. */
  price: PriceDto | null;
  hasPriceRange: boolean;
  /** Sum over active variants. */
  stock: StockDto;
  isSale: boolean;
  isAntidron: boolean;
  publishedAt: string | null;
}
