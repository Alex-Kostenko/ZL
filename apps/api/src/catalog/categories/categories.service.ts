import type { ApiEnv } from '@ml/config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { AppException, ErrorCode } from '../../common/errors';
import { API_ENV } from '../../config/config.module';
import { LocaleService } from '../../i18n/locale.service';
import { mediaUrl } from '../../media/media-url';
import { PrismaService } from '../../prisma/prisma.service';
import type { CategoryDetailDto, CategoryTreeDto } from './categories.dto';
import {
  buildTree,
  type CategoryRow,
  findByPath,
  type LocalizedCategory,
  localizeCategories,
} from './category-tree';

/** Safety net only: writes must call `invalidateCache()`. */
const CACHE_TTL_SECONDS = 60 * 60;
const cacheKey = (locale: string): string => `categories:${locale}`;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly locales: LocaleService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async tree(locale: string): Promise<CategoryTreeDto> {
    return { locale, items: buildTree(await this.localized(locale)) };
  }

  async byPath(locale: string, path: string): Promise<CategoryDetailDto> {
    const category = findByPath(await this.localized(locale), path);
    if (!category) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Category not found', HttpStatus.NOT_FOUND);
    }
    return { locale, ...category };
  }

  /**
   * Call after any change to categories, their translations or images (admin, import, Tria sync).
   * Drops the snapshot of every locale, since a structural change affects all of them.
   */
  async invalidateCache(): Promise<void> {
    const { codes } = await this.locales.settings();
    await this.cache.del(codes.map(cacheKey));
  }

  /** The whole visible tree for one locale: ~hundreds of rows, cached as one Redis value. */
  private async localized(locale: string): Promise<LocalizedCategory[]> {
    return this.cache.getOrSet(cacheKey(locale), CACHE_TTL_SECONDS, async () => {
      const { defaultLocale } = await this.locales.settings();
      return localizeCategories(await this.loadRows(locale, defaultLocale), locale, defaultLocale);
    });
  }

  private async loadRows(locale: string, fallback: string): Promise<CategoryRow[]> {
    // Inactive rows are loaded too: they hide their whole subtree.
    const rows = await this.prisma.category.findMany({
      select: {
        id: true,
        parentId: true,
        slug: true,
        path: true,
        depth: true,
        icon: true,
        position: true,
        isActive: true,
        image: { select: { key: true, width: true, height: true } },
        translations: {
          where: { locale: { in: [...new Set([locale, fallback])] } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    return rows.map(({ image, ...row }) => ({
      ...row,
      image: image
        ? {
            url: mediaUrl(this.env.S3_PUBLIC_URL, image.key),
            width: image.width,
            height: image.height,
          }
        : null,
    }));
  }
}
