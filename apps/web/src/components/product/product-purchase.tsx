'use client';

import type { PriceDto, StockDto } from '@ml/api-client';
import { Button } from '@ml/ui/components/button';
import { cn } from '@ml/ui/lib/utils';
import { Check, ShoppingCart, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { optionGroups, pickVariant, variantOptionKey } from '@/lib/variants';
import { PriceTag } from '../catalog/price-tag';
import { useVariant } from './variant-context';

/**
 * Variant picker, price, stock by warehouse and the buy button. Without a picked variant (none
 * active) it shows the product-level price and stock.
 */
export function ProductPurchase({
  productSku,
  price,
  hasPriceRange,
  stock,
}: {
  productSku: string;
  price: PriceDto | null;
  hasPriceRange: boolean;
  stock: StockDto;
}) {
  const t = useTranslations('product');
  const { variants, variant, setVariant } = useVariant();
  const groups = optionGroups(variants);

  const current = variant
    ? { sku: variant.sku, price: variant.price, stock: variant.stock, from: false }
    : { sku: productSku, price, stock, from: hasPriceRange };

  return (
    <div className="flex flex-col gap-5">
      {variant &&
        groups.map((group) => {
          const selected = variantOptionKey(variant, group.code);
          const selectedText = group.values.find((v) => v.key === selected)?.text;
          return (
            <fieldset key={group.code}>
              <legend className="mb-2 text-sm">
                <span className="text-muted-foreground">{group.name}: </span>
                <span className="font-semibold">
                  {selectedText}
                  {group.unit && selectedText ? ` ${group.unit}` : ''}
                </span>
              </legend>
              {group.values.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const target = pickVariant(variants, variant, group.code, value.key);
                    const active = value.key === selected;
                    const unavailable = !target?.stock.inStock;
                    return (
                      <button
                        key={value.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => target && setVariant(target)}
                        title={unavailable ? t('outOfStock') : undefined}
                        className={cn(
                          'min-w-11 rounded-sm border bg-card px-3 py-1.5 text-sm transition-colors',
                          active
                            ? 'border-primary bg-primary/10 font-semibold text-primary'
                            : 'hover:border-primary/60',
                          unavailable && 'text-muted-foreground line-through decoration-1',
                        )}
                      >
                        {value.text}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          );
        })}

      <div>
        <PriceTag price={current.price} from={current.from} size="lg" />
        {current.price?.discountPercent ? (
          <p className="mt-1 text-sm text-promo">
            {t('discount', { percent: current.price.discountPercent })}
          </p>
        ) : null}
      </div>

      <StockInfo stock={current.stock} />

      <div className="flex flex-col gap-2">
        {/* Cart and checkout arrive in stage 12 (roadmap 12.2–12.3). */}
        <Button size="lg" disabled className="w-full sm:w-auto sm:self-start">
          <ShoppingCart aria-hidden />
          {t('addToCart')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('cartSoon')}</p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('sku')}: <span className="text-foreground tabular-nums">{current.sku}</span>
      </p>
    </div>
  );
}

function StockInfo({ stock }: { stock: StockDto }) {
  const t = useTranslations('product');

  return (
    <div className="rounded-md border bg-card p-4">
      <p
        className={cn(
          'flex items-center gap-2 font-semibold',
          stock.inStock ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {stock.inStock ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <X aria-hidden className="size-4" />
        )}
        {stock.inStock ? t('inStock') : t('outOfStock')}
      </p>
      {stock.warehouses.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          {stock.warehouses.map((warehouse) => (
            <li key={warehouse.code} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{warehouse.name}</span>
              <span className="tabular-nums">{t('units', { count: warehouse.available })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
