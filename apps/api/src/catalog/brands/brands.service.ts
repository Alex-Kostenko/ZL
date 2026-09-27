import type { ApiEnv } from '@ml/config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { AppException, ErrorCode } from '../../common/errors';
import { API_ENV } from '../../config/config.module';
import type { Prisma } from '../../generated/prisma/client';
import { LocaleService } from '../../i18n/locale.service';
import { translator } from '../../i18n/translate';
import { mediaUrl } from '../../media/media-url';
import { PrismaService } from '../../prisma/prisma.service';
import type { BrandDetailDto, BrandListDto, BrandListItemDto } from './brands.dto';

/**
 * Short on purpose: product counts change on every publish, and product writes do not
 * invalidate this key. Brand writes must call `invalidateCache()`.
 */
const LIST_CACHE_TTL_SECONDS = 10 * 60;
const LIST_CACHE_KEY = 'brands:list';

const PUBLISHED = { isPublished: true } satisfies Prisma.ProductWhereInput;

const brandSelect = {
  id: true,
  slug: true,
  name: true,
  country: true,
  logo: { select: { key: true, width: true, height: true } },
} satisfies Prisma.BrandSelect;

type BrandRow = Prisma.BrandGetPayload<{ select: typeof brandSelect }>;

/** Public brand reads (§9). Only active brands are visible; `name` is never translated. */
@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly locales: LocaleService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  /** ~500 rows with no translated fields: one cached snapshot serves every locale. */
  async list(locale: string): Promise<BrandListDto> {
    const items = await this.cache.getOrSet(LIST_CACHE_KEY, LIST_CACHE_TTL_SECONDS, async () => {
      // One GROUP BY over products (~10 ms on 50k) instead of a count subquery per brand.
      const counts = await this.prisma.product.groupBy({
        by: ['brandId'],
        where: { ...PUBLISHED, brandId: { not: null } },
        _count: { _all: true },
      });
      const countOf = new Map(counts.map((c) => [c.brandId!, c._count._all]));
      const rows = await this.prisma.brand.findMany({
        where: { isActive: true, id: { in: [...countOf.keys()] } },
        select: brandSelect,
      });
      return rows
        .map((b) => this.toItem(b, countOf.get(b.id)!))
        .sort((a, b) => a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' }));
    });
    return { locale, items };
  }

  async bySlug(locale: string, slug: string): Promise<BrandDetailDto> {
    const { defaultLocale } = await this.locales.settings();
    const langs = [...new Set([locale, defaultLocale])];
    const brand = await this.prisma.brand.findFirst({
      where: { slug, isActive: true },
      select: {
        ...brandSelect,
        website: true,
        _count: { select: { products: { where: PUBLISHED } } },
        translations: {
          where: { locale: { in: langs } },
          select: { locale: true, description: true },
        },
      },
    });
    if (!brand) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Brand not found', HttpStatus.NOT_FOUND);
    }
    const seoRows = await this.prisma.seoMetadata.findMany({
      where: { entityType: 'BRAND', entityId: brand.id, locale: { in: langs } },
      select: { locale: true, title: true, description: true, noindex: true },
    });
    const seo = translator(seoRows, locale, defaultLocale);

    return {
      locale,
      ...this.toItem(brand, brand._count.products),
      website: brand.website,
      description: translator(brand.translations, locale, defaultLocale)('description'),
      seo: {
        title: seo('title'),
        description: seo('description'),
        noindex: seo('noindex') ?? false,
      },
    };
  }

  /** Call after any change to brands or their logos (admin, import, Tria sync). */
  async invalidateCache(): Promise<void> {
    await this.cache.del([LIST_CACHE_KEY]);
  }

  private toItem({ logo, ...b }: BrandRow, productCount: number): BrandListItemDto {
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      country: b.country,
      logo: logo
        ? {
            url: mediaUrl(this.env.S3_PUBLIC_URL, logo.key),
            width: logo.width,
            height: logo.height,
          }
        : null,
      productCount,
    };
  }
}
