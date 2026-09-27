import { Prisma } from '../../generated/prisma/client';
import { translator } from '../../i18n/translate';
import { mediaUrl } from '../../media/media-url';
import type { PriceDto } from '../pricing/pricing.dto';
import type { AttributeValueDto, ProductAttributeDto, ProductImageDto } from './products.dto';

/** A `product_attribute_values` row with its attribute and option (see `ATTRIBUTE_VALUE_SELECT`). */
export interface AttributeValueRow {
  attributeId: string;
  valueNumber: Prisma.Decimal | string | null;
  valueNumberTo: Prisma.Decimal | string | null;
  valueBoolean: boolean | null;
  valueText: string | null;
  attribute: {
    code: string;
    type: string;
    position: number;
    translations: { locale: string; name: string; unit: string | null }[];
  };
  value: {
    code: string;
    position: number;
    translations: { locale: string; label: string }[];
  } | null;
}

export interface ImageRow {
  variantId: string | null;
  media: {
    key: string;
    width: number | null;
    height: number | null;
    translations: { locale: string; alt: string | null }[];
  };
}

/** Labels for BOOLEAN characteristics; unknown locales use `uk`. */
export const BOOLEAN_TEXT: Record<string, readonly [yes: string, no: string]> = {
  uk: ['Так', 'Ні'],
  ru: ['Да', 'Нет'],
  en: ['Yes', 'No'],
};

/** `12.5000` → `12.5` (plain notation, no trailing zeros). */
const formatNumber = (n: Prisma.Decimal | string): string => new Prisma.Decimal(n).toFixed();

function valueOf(
  row: AttributeValueRow,
  locale: string,
  fallback: string,
): AttributeValueDto | null {
  if (row.value) {
    const label = translator(row.value.translations, locale, fallback)('label');
    return { text: label ?? row.value.code, code: row.value.code };
  }
  if (row.valueNumber !== null) {
    const from = formatNumber(row.valueNumber);
    const text = row.valueNumberTo === null ? from : `${from}–${formatNumber(row.valueNumberTo)}`;
    return { text, code: null };
  }
  if (row.valueBoolean !== null) {
    const [yes, no] = BOOLEAN_TEXT[locale] ?? BOOLEAN_TEXT.uk!;
    return { text: row.valueBoolean ? yes : no, code: null };
  }
  if (row.valueText !== null) return { text: row.valueText, code: null };
  return null;
}

/**
 * Groups value rows into characteristics (MULTI_SELECT → several values), ordered by attribute
 * position then code; options by their position. Names/labels fall back per field (§59).
 */
export function toAttributes(
  rows: readonly AttributeValueRow[],
  locale: string,
  fallback: string,
): ProductAttributeDto[] {
  const groups = new Map<
    string,
    { rows: AttributeValueRow[]; attr: AttributeValueRow['attribute'] }
  >();
  for (const row of rows) {
    const group = groups.get(row.attributeId) ?? { rows: [], attr: row.attribute };
    group.rows.push(row);
    groups.set(row.attributeId, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.attr.position - b.attr.position || a.attr.code.localeCompare(b.attr.code))
    .map(({ attr, rows: values }) => {
      const t = translator(attr.translations, locale, fallback);
      return {
        code: attr.code,
        name: t('name') ?? attr.code,
        unit: t('unit'),
        type: attr.type,
        values: values
          .sort((a, b) => (a.value?.position ?? 0) - (b.value?.position ?? 0))
          .map((v) => valueOf(v, locale, fallback))
          .filter((v): v is AttributeValueDto => v !== null),
      };
    })
    .filter((a) => a.values.length > 0);
}

export function toImage(
  row: ImageRow,
  publicBaseUrl: string,
  locale: string,
  fallback: string,
  title: string,
): ProductImageDto {
  return {
    url: mediaUrl(publicBaseUrl, row.media.key),
    width: row.media.width,
    height: row.media.height,
    alt: translator(row.media.translations, locale, fallback)('alt') ?? title,
    variantId: row.variantId,
  };
}

/** More than one distinct current price among the variants. */
export function hasPriceRange(prices: readonly (PriceDto | null)[]): boolean {
  return new Set(prices.filter((p) => p !== null).map((p) => p.amount)).size > 1;
}
