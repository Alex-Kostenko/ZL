import { IsString, Matches, MaxLength } from 'class-validator';
import { LocaleQueryDto } from '../../i18n/locale-query.dto';

export class CategoryImageDto {
  url: string;
  width: number | null;
  height: number | null;
}

export class CategoryNodeDto {
  id: string;
  slug: string;
  /** Full slug path, e.g. `zbroia/vohnepalna-zbroia`; the storefront URL is `/category/{path}`. */
  path: string;
  /** 0 for root categories. */
  depth: number;
  /** Name in the response locale (falls back to `uk`). */
  name: string;
  /** Lucide icon name for menus. */
  icon: string | null;
  image: CategoryImageDto | null;
  /** Active subcategories in menu order. */
  children: CategoryNodeDto[];
}

export class CategoryTreeDto {
  /** Locale the names are in. */
  locale: string;
  /** Active root categories with their active descendants. */
  items: CategoryNodeDto[];
}

export class BreadcrumbDto {
  name: string;
  path: string;
}

export class CategorySummaryDto {
  id: string;
  slug: string;
  path: string;
  name: string;
  icon: string | null;
  image: CategoryImageDto | null;
}

export class CategoryDetailDto {
  locale: string;
  id: string;
  slug: string;
  path: string;
  depth: number;
  name: string;
  description: string | null;
  icon: string | null;
  image: CategoryImageDto | null;
  /** Root → this category (inclusive). */
  breadcrumbs: BreadcrumbDto[];
  /** Direct active subcategories. */
  children: CategorySummaryDto[];
}

export class CategoryByPathQueryDto extends LocaleQueryDto {
  /**
   * Slug path without leading/trailing slashes.
   * @example zbroia/vohnepalna-zbroia
   */
  @IsString()
  @MaxLength(1000)
  @Matches(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, { message: 'path must be slugs separated by /' })
  path: string;
}
