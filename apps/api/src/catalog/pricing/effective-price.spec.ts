import { describe, expect, it } from 'vitest';
import { minPrice, pickPriceRow, type PriceRow, toPriceDto } from './effective-price';

const at = new Date('2026-09-15T12:00:00Z');
const day = (d: number) => new Date(Date.UTC(2026, 8, d));

function row(extra: Partial<PriceRow> & { id?: string } = {}): PriceRow & { id: string } {
  return {
    id: 'base',
    price: '1000.00',
    oldPrice: null,
    salePrice: null,
    currency: 'UAH',
    validFrom: null,
    validTo: null,
    createdAt: day(1),
    ...extra,
  };
}

describe('pickPriceRow', () => {
  it('ignores rows outside their validity window (validTo is exclusive)', () => {
    const rows = [
      row({ id: 'future', validFrom: day(20) }),
      row({ id: 'expired', validTo: day(10) }),
      row({ id: 'ends-now', validTo: at }),
    ];
    expect(pickPriceRow(rows, at)).toBeNull();
  });

  it('prefers the latest validFrom, treating an open start as the oldest', () => {
    const rows = [
      row({ id: 'base' }),
      row({ id: 'promo', validFrom: day(10), validTo: day(20) }),
      row({ id: 'older-promo', validFrom: day(5) }),
    ];
    expect(pickPriceRow(rows, at)?.id).toBe('promo');
    expect(pickPriceRow(rows, day(21))?.id).toBe('older-promo');
    expect(pickPriceRow(rows, day(2))?.id).toBe('base');
  });

  it('breaks validFrom ties by the most recently created row', () => {
    const rows = [row({ id: 'old', createdAt: day(1) }), row({ id: 'new', createdAt: day(3) })];
    expect(pickPriceRow(rows, at)?.id).toBe('new');
  });
});

describe('toPriceDto', () => {
  it('sells at the regular price without a discount', () => {
    expect(toPriceDto(row({ price: 1000 }))).toEqual({
      currency: 'UAH',
      amount: '1000.00',
      oldAmount: null,
      discountPercent: null,
    });
  });

  it('sells at salePrice and crosses out the regular price', () => {
    expect(toPriceDto(row({ price: '1000', salePrice: '799.5' }))).toMatchObject({
      amount: '799.50',
      oldAmount: '1000.00',
      discountPercent: 20,
    });
  });

  it('uses oldPrice as the reference and hides it when not higher', () => {
    expect(toPriceDto(row({ price: '900', oldPrice: '1200' }))).toMatchObject({
      amount: '900.00',
      oldAmount: '1200.00',
      discountPercent: 25,
    });
    expect(toPriceDto(row({ price: '900', oldPrice: '900' })).oldAmount).toBeNull();
  });

  it('keeps cents exact', () => {
    expect(toPriceDto(row({ price: '0.10', salePrice: '0.07' }))).toMatchObject({
      amount: '0.07',
      discountPercent: 30,
    });
  });
});

describe('minPrice', () => {
  it('returns the lowest amount, compared as decimals', () => {
    const a = toPriceDto(row({ price: '1000' }));
    const b = toPriceDto(row({ price: '999.99' }));
    expect(minPrice([a, null, b])).toBe(b);
    expect(minPrice([null])).toBeNull();
  });
});
