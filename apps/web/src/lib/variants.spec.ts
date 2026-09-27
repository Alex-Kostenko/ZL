import type { ProductVariantDto } from '@ml/api-client';
import { describe, expect, it } from 'vitest';
import { defaultVariant, optionGroups, pickVariant } from './variants';

function variant(id: string, options: Record<string, string>, inStock = true): ProductVariantDto {
  return {
    id,
    sku: id,
    barcode: null,
    options: Object.entries(options).map(([code, value]) => ({
      code,
      name: code.toUpperCase(),
      unit: null,
      type: 'SELECT',
      values: [{ text: value.toUpperCase(), code: value }],
    })),
    price: null,
    stock: { available: inStock ? 1 : 0, inStock, warehouses: [] },
  };
}

const variants = [
  variant('s-green', { size: 's', color: 'green' }, false),
  variant('m-green', { size: 'm', color: 'green' }),
  variant('m-black', { size: 'm', color: 'black' }),
  variant('l-black', { size: 'l', color: 'black' }),
];

describe('optionGroups', () => {
  it('collects distinct values per option in first-seen order', () => {
    expect(optionGroups(variants)).toEqual([
      {
        code: 'size',
        name: 'SIZE',
        unit: null,
        values: [
          { key: 's', text: 'S' },
          { key: 'm', text: 'M' },
          { key: 'l', text: 'L' },
        ],
      },
      {
        code: 'color',
        name: 'COLOR',
        unit: null,
        values: [
          { key: 'green', text: 'GREEN' },
          { key: 'black', text: 'BLACK' },
        ],
      },
    ]);
  });

  it('keys free-form values by text', () => {
    const [group] = optionGroups([
      {
        ...variant('a', {}),
        options: [
          {
            code: 'len',
            name: 'Len',
            unit: 'мм',
            type: 'NUMBER',
            values: [{ text: '120', code: null }],
          },
        ],
      },
    ]);
    expect(group?.values).toEqual([{ key: '120', text: '120' }]);
  });
});

describe('defaultVariant', () => {
  it('prefers the first variant in stock', () => {
    expect(defaultVariant(variants)?.id).toBe('m-green');
  });

  it('falls back to the first variant', () => {
    expect(defaultVariant([variant('a', {}, false)])?.id).toBe('a');
    expect(defaultVariant([])).toBeUndefined();
  });
});

describe('pickVariant', () => {
  const [sGreen, mGreen, mBlack] = variants as [
    ProductVariantDto,
    ProductVariantDto,
    ProductVariantDto,
  ];

  it('keeps the other choices when that combination exists', () => {
    expect(pickVariant(variants, mGreen, 'color', 'black')?.id).toBe('m-black');
    expect(pickVariant(variants, mBlack, 'color', 'green')?.id).toBe('m-green');
  });

  it('switches the other options when the combination does not exist', () => {
    expect(pickVariant(variants, mGreen, 'size', 'l')?.id).toBe('l-black');
  });

  it('returns an out-of-stock combination rather than changing other choices', () => {
    expect(pickVariant(variants, mGreen, 'size', 's')?.id).toBe('s-green');
    expect(pickVariant(variants, sGreen, 'size', 'm')?.id).toBe('m-green');
  });

  it('returns undefined for an unknown value', () => {
    expect(pickVariant(variants, mGreen, 'size', 'xxl')).toBeUndefined();
  });
});
