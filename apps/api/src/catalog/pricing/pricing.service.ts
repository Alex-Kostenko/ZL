import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { pickPriceRow, type PriceRow, toPriceDto } from './effective-price';
import type { PriceDto } from './pricing.dto';

/** Storefront currency until multi-currency settings exist (13.3). */
export const DEFAULT_CURRENCY = 'UAH';

/** Price types change only via migration/admin, so a short in-process cache is enough. */
const PRICE_TYPE_TTL_MS = 60_000;

/**
 * Current prices (§10). The single place that decides which price a variant sells at:
 * storefront, search indexing and checkout (12.3) all ask this service.
 */
@Injectable()
export class PricingService {
  private defaultType?: { value: Promise<string | null>; expiresAt: number };

  constructor(private readonly prisma: PrismaService) {}

  /** Retail price of each variant at `at`; variants without a valid price are absent. */
  async forVariants(
    variantIds: readonly string[],
    at = new Date(),
  ): Promise<Map<string, PriceDto>> {
    const result = new Map<string, PriceDto>();
    const priceTypeId = await this.defaultPriceTypeId();
    if (variantIds.length === 0 || !priceTypeId) return result;

    const rows = await this.prisma.price.findMany({
      where: {
        variantId: { in: [...variantIds] },
        priceTypeId,
        currency: DEFAULT_CURRENCY,
        OR: [{ validFrom: null }, { validFrom: { lte: at } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gt: at } }] }],
      },
      select: {
        variantId: true,
        currency: true,
        price: true,
        oldPrice: true,
        salePrice: true,
        validFrom: true,
        validTo: true,
        createdAt: true,
      },
    });

    const byVariant = new Map<string, PriceRow[]>();
    for (const { variantId, ...row } of rows) {
      const list = byVariant.get(variantId) ?? [];
      list.push(row);
      byVariant.set(variantId, list);
    }
    for (const [variantId, list] of byVariant) {
      const row = pickPriceRow(list, at);
      if (row) result.set(variantId, toPriceDto(row));
    }
    return result;
  }

  private defaultPriceTypeId(): Promise<string | null> {
    if (!this.defaultType || this.defaultType.expiresAt < Date.now()) {
      const value = this.prisma.priceType
        .findFirst({ where: { isDefault: true }, select: { id: true } })
        .then((row) => row?.id ?? null);
      this.defaultType = { value, expiresAt: Date.now() + PRICE_TYPE_TTL_MS };
      value.catch(() => (this.defaultType = undefined));
    }
    return this.defaultType.value;
  }
}
