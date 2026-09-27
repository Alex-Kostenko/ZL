import type { ApiEnv } from '@ml/config';
import { Inject, Injectable } from '@nestjs/common';
import { CategoriesService } from '../catalog/categories/categories.service';
import { InventoryService } from '../catalog/inventory/inventory.service';
import { PricingService } from '../catalog/pricing/pricing.service';
import { API_ENV } from '../config/config.module';
import type { Prisma } from '../generated/prisma/client';
import { LocaleService } from '../i18n/locale.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryLookup, type ProductSourceRow, toProductDocument } from './product-document';
import type { ProductDocument } from './product-index';

/** Search documents of a batch of products, per locale. */
export interface ProductDocumentBatch {
  /** Locale → documents of the published products (same order in every locale). */
  documents: Map<string, ProductDocument[]>;
  /** Requested ids that must not be in the index (deleted or unpublished). */
  removedIds: string[];
}

const productSourceSelect = {
  id: true,
  slug: true,
  sku: true,
  isSale: true,
  isAntidron: true,
  publishedAt: true,
  translations: {
    select: { locale: true, title: true, shortDescription: true, description: true },
  },
  brand: { select: { id: true, slug: true, name: true, isActive: true } },
  media: {
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
    take: 1,
    select: {
      variantId: true,
      media: {
        select: {
          key: true,
          width: true,
          height: true,
          translations: { select: { locale: true, alt: true } },
        },
      },
    },
  },
  categories: { select: { categoryId: true } },
  variants: {
    where: { status: 'ACTIVE' },
    orderBy: [{ position: 'asc' }, { sku: 'asc' }],
    select: { id: true, sku: true, barcode: true },
  },
  attributeValues: {
    where: { attribute: { OR: [{ isFilterable: true }, { isSearchable: true }] } },
    select: {
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
          isFilterable: true,
          isSearchable: true,
          translations: { select: { locale: true, name: true, unit: true } },
        },
      },
      value: {
        select: {
          code: true,
          position: true,
          translations: { select: { locale: true, label: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

/**
 * Builds search documents from PostgreSQL (§12). Prices and stock come from PricingService /
 * InventoryService, categories from the cached visible tree — the same rules as the storefront.
 * Used by full and incremental indexing (7.2); batches keep memory flat on 50k products.
 */
@Injectable()
export class ProductDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locales: LocaleService,
    private readonly categories: CategoriesService,
    private readonly pricing: PricingService,
    private readonly inventory: InventoryService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async build(productIds: readonly string[]): Promise<ProductDocumentBatch> {
    const { codes, defaultLocale } = await this.locales.settings();
    const rows: ProductSourceRow[] = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: [...productIds] }, isPublished: true },
          orderBy: { id: 'asc' },
          select: productSourceSelect,
        })
      : [];

    const variantIds = rows.flatMap((p) => p.variants.map((v) => v.id));
    const [prices, stock, lookups] = await Promise.all([
      this.pricing.forVariants(variantIds),
      this.inventory.forVariants(variantIds),
      Promise.all(
        codes.map(async (locale) => new CategoryLookup(await this.categories.localized(locale))),
      ),
    ]);

    const documents = new Map<string, ProductDocument[]>();
    codes.forEach((locale, i) => {
      const ctx = {
        locale,
        fallback: defaultLocale,
        publicBaseUrl: this.env.S3_PUBLIC_URL,
        prices,
        stock,
        categories: lookups[i]!,
      };
      documents.set(
        locale,
        rows.map((row) => toProductDocument(row, ctx)),
      );
    });

    const indexed = new Set(rows.map((r) => r.id));
    return { documents, removedIds: productIds.filter((id) => !indexed.has(id)) };
  }
}
