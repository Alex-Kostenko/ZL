// Display formatting shared by server and client components.

/** Keeps the amount and the currency sign on one line. */
const NBSP = String.fromCharCode(0xa0);

const CURRENCY_SIGNS: Record<string, string> = { UAH: '₴' };

/**
 * `"12499.00"` → `12 499 ₴` (kopecks only when non-zero). Money comes from the API as a decimal
 * string; it is never used for arithmetic here.
 */
export function formatPrice(amount: string | number, locale: string, currency = 'UAH'): string {
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
  return `${number}${NBSP}${CURRENCY_SIGNS[currency] ?? currency}`;
}

/** `1234.5` → `1 234,5` in the locale's digit grouping. */
export const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
