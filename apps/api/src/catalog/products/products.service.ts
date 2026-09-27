import type { ApiEnv } from '@ml/config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException, ErrorCode } from '../../common/errors';
import { API_ENV } from '../../config/config.module';
import type { Prisma } from '../../generated/prisma/client';
import { LocaleService } from '../../i18n/locale.service';
import { translator } from '../../i18n/translate';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { InventoryService } from '../inventory/inventory.service';
import { minPrice } from '../pricing/effective-price';
import { PricingService } from '../pricing/pricing.service';
import { hasPriceRange, type ImageRow, toAttributes, toImage } from './product-mapper';
import type {
  ProductDetailDto,
  ProductListDto,
  ProductListItemDto,
  ProductListQueryDto,
} from './products.dto';

const translationsIn = (locales: string[]) => ({ where: { locale: { in: locales } } });

const imageSelect = (locales: string[]) =>
  ({
    variantId: true,
    media: {
      select: {
        key: true,
        width: true,
        height: true,
        translations: { ...translationsIn(locales), select: { locale: true, alt: true } },
      },
    },
  }) satisfies Prisma.ProductMediaSelect;

const attributeValueSelect = (locales: string[]) =>
  ({
    variantId: true,
    attributeId: true,
    valueNumber: true,
    valueNumberTo: true,
    valueBoolean: true,
    valueText: true,
    attribute: {
      select: {
        code: true,
        type: true,
        position: true,
        translations: {
          ...translationsIn(locales),
          select: { locale: true, name: true, unit: true },
        },
      },
    },
    value: {
      select: {
        code: true,
        position: true,
        translations: { ...translationsIn(locales), select: { locale: true, label: true } },
      },
    },
  }) satisfies Prisma.ProductAttributeValueSelect;

/** Primary image first, then gallery order. */
const GALLERY_ORDER = [
  { isPrimary: 'desc' },
  { position: 'asc' },
] satisfies Prisma.ProductMediaOrderByWithRelationInput[];

const ACTIVE_VARIANTS = { status: 'ACTIVE' } satisfies Prisma.ProductVariantWhereInput;

/** SQL listing filter; a flag left `undefined` does not filter. */
export interface SqlListFilter {
  /** A category with its visible subtree. */
  categoryIds?: string[];
  /** Active brands (any of). */
  brandIds?: string[];
  sale?: boolean;
  antidron?: boolean;
  inStock?: boolean;
}

/**
 * Public product reads (§6, §7). Visibility = `isPublished`; prices and stock always come from
 * PricingService / InventoryService, never from product rows.
 * The listing is the SQL path (newest first): storefront listings go through Meilisearch
 * (`GET /search`, 7.4), which falls back to `listByFilter()` when search is unavailable.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locales: LocaleService,
    private readonly categories: CategoriesService,
    private readonly pricing: PricingService,
    private readonly inventory: InventoryService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async list(locale: string, query: ProductListQueryDto): Promise<ProductListDto> {
    const filter: SqlListFilter = { sale: query.sale, antidron: query.antidron };
    if (query.category) {
      const ids = await this.categories.subtreeIds(query.category);
      if (!ids) throw notFound('Category not found');
      filter.categoryIds = ids;
    }
    if (query.brand) {
      const brand = await this.prisma.brand.findUnique({
        where: { slug: query.brand },
        select: { id: true, isActive: true },
      });
      if (!brand?.isActive) throw notFound('Brand not found');
      filter.brandIds = [brand.id];
    }
    return this.listByFilter(locale, filter, query.page, query.limit);
  }

  /** Published products matching `filter`, newest first. Ids must already be resolved and visible. */
  async listByFilter(
    locale: string,
    filter: SqlListFilter,
    page: number,
    limit: number,
  ): Promise<ProductListDto> {
    const where: Prisma.ProductWhereInput = {
      isPublished: true,
      isSale: filter.sale,
      isAntidron: filter.antidron,
      ...(filter.categoryIds && {
        categories: { some: { categoryId: { in: filter.categoryIds } } },
      }),
      ...(filter.brandIds && { brandId: { in: filter.brandIds } }),
      // Same rule as InventoryService: an active variant with sellable stock in an active warehouse.
      ...(filter.inStock && {
        variants: {
          some: {
            ...ACTIVE_VARIANTS,
            inventory: { some: { available: { gt: 0 }, warehouse: { isActive: true } } },
          },
        },
      }),
    };

    const langs = await this.langs(locale);
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          sku: true,
          isSale: true,
          isAntidron: true,
          translations: { ...translationsIn(langs), select: { locale: true, title: true } },
          brand: { select: { id: true, slug: true, name: true, isActive: true } },
          media: { orderBy: GALLERY_ORDER, take: 1, select: imageSelect(langs) },
          variants: { where: ACTIVE_VARIANTS, select: { id: true } },
        },
      }),
    ]);

    const variantIds = rows.flatMap((p) => p.variants.map((v) => v.id));
    const [prices, stock] = await Promise.all([
      this.pricing.forVariants(variantIds),
      this.inventory.forVariants(variantIds),
    ]);
    const fallback = langs.at(-1)!;

    const items = rows.map((p): ProductListItemDto => {
      const ids = p.variants.map((v) => v.id);
      const variantPrices = ids.map((id) => prices.get(id) ?? null);
      const productStock = stock.total(ids);
      const title = translator(p.translations, locale, fallback)('title') ?? p.sku;
      const [image] = p.media;
      return {
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        title,
        brand: brandRef(p.brand),
        image: image ? this.image(image, locale, fallback, title) : null,
        price: minPrice(variantPrices),
        hasPriceRange: hasPriceRange(variantPrices),
        available: productStock.available,
        inStock: productStock.inStock,
        isSale: p.isSale,
        isAntidron: p.isAntidron,
        variantCount: ids.length,
      };
    });

    return {
      locale,
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bySlug(locale: string, slug: string): Promise<ProductDetailDto> {
    const langs = await this.langs(locale);
    const fallback = langs.at(-1)!;
    const p = await this.prisma.product.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        slug: true,
        sku: true,
        isSale: true,
        isAntidron: true,
        publishedAt: true,
        primaryCategoryId: true,
        translations: {
          ...translationsIn(langs),
          select: { locale: true, title: true, shortDescription: true, description: true },
        },
        brand: { select: { id: true, slug: true, name: true, isActive: true } },
        media: { orderBy: GALLERY_ORDER, select: imageSelect(langs) },
        variants: {
          where: ACTIVE_VARIANTS,
          orderBy: [{ position: 'asc' }, { sku: 'asc' }],
          select: { id: true, sku: true, barcode: true },
        },
        attributeValues: { select: attributeValueSelect(langs) },
      },
    });
    if (!p) throw notFound('Product not found');

    const variantIds = p.variants.map((v) => v.id);
    const [prices, stock, breadcrumbs] = await Promise.all([
      this.pricing.forVariants(variantIds),
      this.inventory.forVariants(variantIds),
      p.primaryCategoryId ? this.categories.breadcrumbs(locale, p.primaryCategoryId) : [],
    ]);

    const t = translator(p.translations, locale, fallback);
    const title = t('title') ?? p.sku;
    const active = new Set(variantIds);
    const variantPrices = variantIds.map((id) => prices.get(id) ?? null);
    const current = breadcrumbs.at(-1);

    return {
      locale,
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      title,
      shortDescription: t('shortDescription'),
      description: t('description'),
      brand: brandRef(p.brand),
      category: current && p.primaryCategoryId ? { id: p.primaryCategoryId, ...current } : null,
      breadcrumbs,
      images: p.media.map((m) =>
        this.image(
          { ...m, variantId: m.variantId && active.has(m.variantId) ? m.variantId : null },
          locale,
          fallback,
          title,
        ),
      ),
      attributes: toAttributes(
        p.attributeValues.filter((v) => v.variantId === null),
        locale,
        fallback,
      ),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        options: toAttributes(
          p.attributeValues.filter((a) => a.variantId === v.id),
          locale,
          fallback,
        ),
        price: prices.get(v.id) ?? null,
        stock: stock.of(v.id),
      })),
      price: minPrice(variantPrices),
      hasPriceRange: hasPriceRange(variantPrices),
      stock: stock.total(variantIds),
      isSale: p.isSale,
      isAntidron: p.isAntidron,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    };
  }

  /** Locales to load translations for: the requested one and the default (always last). */
  private async langs(locale: string): Promise<string[]> {
    const { defaultLocale } = await this.locales.settings();
    return locale === defaultLocale ? [locale] : [locale, defaultLocale];
  }

  private image(row: ImageRow, locale: string, fallback: string, title: string) {
    return toImage(row, this.env.S3_PUBLIC_URL, locale, fallback, title);
  }
}

function brandRef(brand: { id: string; slug: string; name: string; isActive: boolean } | null) {
  return brand?.isActive ? { id: brand.id, slug: brand.slug, name: brand.name } : null;
}

function notFound(message: string): AppException {
  return new AppException(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
}
