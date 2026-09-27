import { IsString, Matches, MaxLength } from 'class-validator';

export class BrandLogoDto {
  url: string;
  width: number | null;
  height: number | null;
}

/** Brands index tile (`/brands`). */
export class BrandListItemDto {
  id: string;
  slug: string;
  /** Proper name, not translated. */
  name: string;
  /** ISO 3166-1 alpha-2, e.g. `US`. */
  country: string | null;
  logo: BrandLogoDto | null;
  /** Published products of the brand. */
  productCount: number;
}

export class BrandListDto {
  locale: string;
  /** Active brands with at least one published product, by name. */
  items: BrandListItemDto[];
}

export class BrandSeoDto {
  /** `null` → the storefront builds it from the template. */
  title: string | null;
  description: string | null;
  noindex: boolean;
}

/** Brand page (`/brand/{slug}`); its products come from `GET /products?brand={slug}`. */
export class BrandDetailDto extends BrandListItemDto {
  locale: string;
  website: string | null;
  /** In the response locale (falls back to `uk`). */
  description: string | null;
  seo: BrandSeoDto;
}

export class BrandSlugParamDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be a slug' })
  slug: string;
}
