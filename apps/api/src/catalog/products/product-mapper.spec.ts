import { describe, expect, it } from 'vitest';
import { type AttributeValueRow, hasPriceRange, toAttributes } from './product-mapper';

function attr(
  id: string,
  type: string,
  position: number,
  extra: Partial<AttributeValueRow> = {},
): AttributeValueRow {
  return {
    attributeId: id,
    valueNumber: null,
    valueNumberTo: null,
    valueBoolean: null,
    valueText: null,
    attribute: {
      code: id,
      type,
      position,
      translations: [
        { locale: 'uk', name: `uk:${id}`, unit: 'мм' },
        { locale: 'en', name: `en:${id}`, unit: null },
      ],
    },
    value: null,
    ...extra,
  };
}

const option = (code: string, position: number, labels: Record<string, string>) => ({
  code,
  position,
  translations: Object.entries(labels).map(([locale, label]) => ({ locale, label })),
});

describe('toAttributes', () => {
  const rows = [
    attr('colour', 'MULTI_SELECT', 2, { value: option('green', 2, { uk: 'Зелений' }) }),
    attr('length', 'NUMBER', 1, { valueNumber: '120.5000' }),
    attr('zoom', 'RANGE', 3, { valueNumber: '3.0000', valueNumberTo: '9.0000' }),
    attr('colour', 'MULTI_SELECT', 2, { value: option('black', 1, { uk: 'Чорний', en: 'Black' }) }),
    attr('waterproof', 'BOOLEAN', 4, { valueBoolean: true }),
    attr('model', 'STRING', 5, { valueText: 'SR-25' }),
  ];

  it('groups multi-select options and orders by attribute and option position', () => {
    const list = toAttributes(rows, 'uk', 'uk');
    expect(list.map((a) => a.code)).toEqual(['length', 'colour', 'zoom', 'waterproof', 'model']);
    expect(list[1]!.values).toEqual([
      { text: 'Чорний', code: 'black' },
      { text: 'Зелений', code: 'green' },
    ]);
  });

  it('formats numbers, ranges, booleans and text', () => {
    const texts = toAttributes(rows, 'uk', 'uk').map((a) => a.values.map((v) => v.text).join(','));
    expect(texts).toEqual(['120.5', 'Чорний,Зелений', '3–9', 'Так', 'SR-25']);
  });

  it('falls back per field for names, units and labels', () => {
    const list = toAttributes(rows, 'en', 'uk');
    expect(list[0]).toMatchObject({ name: 'en:length', unit: 'мм' });
    expect(list[1]!.values.map((v) => v.text)).toEqual(['Black', 'Зелений']);
    expect(list.find((a) => a.code === 'waterproof')!.values[0]!.text).toBe('Yes');
  });
});

describe('hasPriceRange', () => {
  const p = (amount: string) => ({
    currency: 'UAH',
    amount,
    oldAmount: null,
    discountPercent: null,
  });

  it('is true only for different amounts', () => {
    expect(hasPriceRange([p('10.00'), null, p('10.00')])).toBe(false);
    expect(hasPriceRange([p('10.00'), p('12.00')])).toBe(true);
  });
});
