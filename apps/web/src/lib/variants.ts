import type { AttributeValueDto, ProductVariantDto } from '@ml/api-client';

// Variant picker logic for the product page. Pure: shared by server render and client state.

export interface OptionValue {
  /** Stable identity of the value: option code, or the text for free-form values. */
  key: string;
  text: string;
}

export interface OptionGroup {
  code: string;
  name: string;
  unit: string | null;
  values: OptionValue[];
}

const valueKey = (values: AttributeValueDto[]) => values.map((v) => v.code ?? v.text).join(',');
const valueText = (values: AttributeValueDto[]) => values.map((v) => v.text).join(', ');

/** The variant's value key for one option; `undefined` when the variant does not set it. */
export function variantOptionKey(variant: ProductVariantDto, code: string): string | undefined {
  const option = variant.options.find((o) => o.code === code);
  return option ? valueKey(option.values) : undefined;
}

/** Option groups (calibre, size, colour) across variants, in first-seen order. */
export function optionGroups(variants: ProductVariantDto[]): OptionGroup[] {
  const groups = new Map<string, OptionGroup>();
  for (const variant of variants) {
    for (const option of variant.options) {
      const group =
        groups.get(option.code) ??
        groups
          .set(option.code, { code: option.code, name: option.name, unit: option.unit, values: [] })
          .get(option.code)!;
      const key = valueKey(option.values);
      if (key && !group.values.some((v) => v.key === key)) {
        group.values.push({ key, text: valueText(option.values) });
      }
    }
  }
  return [...groups.values()];
}

/** Preselected variant: the first one in stock, else the first one. */
export function defaultVariant(variants: ProductVariantDto[]): ProductVariantDto | undefined {
  return variants.find((v) => v.stock.inStock) ?? variants[0];
}

/**
 * The variant to switch to when the shopper picks `key` for option `code`. Prefers keeping the
 * other current choices (in stock first), then any variant with that value (in stock first).
 */
export function pickVariant(
  variants: ProductVariantDto[],
  current: ProductVariantDto,
  code: string,
  key: string,
): ProductVariantDto | undefined {
  const withValue = variants.filter((v) => variantOptionKey(v, code) === key);
  const keepsOthers = withValue.filter((v) =>
    current.options.every(
      (o) => o.code === code || variantOptionKey(v, o.code) === valueKey(o.values),
    ),
  );
  return (
    keepsOthers.find((v) => v.stock.inStock) ??
    keepsOthers[0] ??
    withValue.find((v) => v.stock.inStock) ??
    withValue[0]
  );
}
