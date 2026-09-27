import { Prisma } from '../../generated/prisma/client';
import type { PriceDto } from './pricing.dto';

type Money = Prisma.Decimal | string | number;

/** A `prices` row already narrowed to one variant, price type and currency. */
export interface PriceRow {
  price: Money;
  oldPrice: Money | null;
  salePrice: Money | null;
  currency: string;
  validFrom: Date | null;
  validTo: Date | null;
  createdAt: Date;
}

const isValidAt = (row: PriceRow, at: Date): boolean =>
  (row.validFrom === null || row.validFrom <= at) && (row.validTo === null || row.validTo > at);

/**
 * The price row in force at `at` (§10): among rows whose [validFrom, validTo) contains `at`,
 * the latest `validFrom` wins (open start = oldest), then the most recently created row.
 * So a dated promotion overrides the open-ended base price without editing it.
 */
export function pickPriceRow<T extends PriceRow>(rows: readonly T[], at: Date): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (!isValidAt(row, at)) continue;
    if (!best) {
      best = row;
      continue;
    }
    const from = row.validFrom?.getTime() ?? -Infinity;
    const bestFrom = best.validFrom?.getTime() ?? -Infinity;
    if (from > bestFrom || (from === bestFrom && row.createdAt > best.createdAt)) best = row;
  }
  return best;
}

/**
 * Storefront price of a row: selling amount = `salePrice ?? price`; the crossed-out amount is
 * `oldPrice`, or the regular `price` when a sale price applies, and is shown only if higher.
 */
export function toPriceDto(row: PriceRow): PriceDto {
  const price = new Prisma.Decimal(row.price);
  const amount = row.salePrice === null ? price : new Prisma.Decimal(row.salePrice);
  const reference = row.oldPrice === null ? price : new Prisma.Decimal(row.oldPrice);
  const old = reference.gt(amount) ? reference : null;
  return {
    currency: row.currency,
    amount: amount.toFixed(2),
    oldAmount: old ? old.toFixed(2) : null,
    discountPercent: old ? old.minus(amount).div(old).times(100).round().toNumber() : null,
  };
}

/** The lowest price of a product's variants (the "from" price on listings), or `null`. */
export function minPrice(prices: readonly (PriceDto | null)[]): PriceDto | null {
  let min: PriceDto | null = null;
  for (const p of prices) {
    if (p && (!min || new Prisma.Decimal(p.amount).lt(min.amount))) min = p;
  }
  return min;
}
