/** Money is a decimal string with 2 fractional digits (`"1299.00"`), never a float. */
export class PriceDto {
  /** ISO 4217, e.g. `UAH`. */
  currency: string;
  /**
   * Selling price (`salePrice ?? price`).
   * @example 1299.00
   */
  amount: string;
  /**
   * Crossed-out reference price; present only when greater than `amount`.
   * @example 1599.00
   */
  oldAmount: string | null;
  /** Whole-percent discount from `oldAmount`, e.g. 19. */
  discountPercent: number | null;
}
