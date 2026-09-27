import { describe, expect, it } from 'vitest';
import { StockSnapshot } from './inventory.service';
import { type StockRow, toStockDto } from './stock';

const kyiv = { code: 'kyiv', name: 'Київ', position: 0, isActive: true };
const lviv = { code: 'lviv', name: 'Львів', position: 1, isActive: true };
const closed = { code: 'closed', name: 'Закритий', position: 2, isActive: false };

const at = (warehouse: StockRow['warehouse'], available: number): StockRow => ({
  available,
  warehouse,
});

describe('toStockDto', () => {
  it('sums active warehouses in position order', () => {
    expect(toStockDto([at(lviv, 2), at(kyiv, 3), at(closed, 10)])).toEqual({
      available: 5,
      inStock: true,
      warehouses: [
        { code: 'kyiv', name: 'Київ', available: 3 },
        { code: 'lviv', name: 'Львів', available: 2 },
      ],
    });
  });

  it('treats over-reserved (negative) rows as 0 without hiding other stock', () => {
    expect(toStockDto([at(kyiv, -4), at(lviv, 1)])).toMatchObject({ available: 1, inStock: true });
    expect(toStockDto([at(kyiv, -1)])).toEqual({ available: 0, inStock: false, warehouses: [] });
    expect(toStockDto([])).toMatchObject({ available: 0, inStock: false });
  });
});

describe('StockSnapshot', () => {
  const snapshot = new StockSnapshot(
    new Map([
      ['a', [at(lviv, 2)]],
      ['b', [at(kyiv, 1), at(lviv, -3)]],
    ]),
  );

  it('answers per variant, including unknown ones', () => {
    expect(snapshot.of('a').available).toBe(2);
    expect(snapshot.of('missing').inStock).toBe(false);
  });

  it('merges a product total per warehouse, clamping each variant row', () => {
    expect(snapshot.total(['a', 'b'])).toEqual({
      available: 3,
      inStock: true,
      warehouses: [
        { code: 'kyiv', name: 'Київ', available: 1 },
        { code: 'lviv', name: 'Львів', available: 2 },
      ],
    });
  });
});
