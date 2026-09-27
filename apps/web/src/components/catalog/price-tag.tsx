import type { PriceDto } from '@ml/api-client';
import { cn } from '@ml/ui/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/format';

/** Selling price (promo colour when discounted) + crossed-out old price. Server or client. */
export function PriceTag({
  price,
  from = false,
  size = 'md',
}: {
  price: PriceDto | null;
  /** Variants differ in price: "from …". */
  from?: boolean;
  size?: 'md' | 'lg';
}) {
  const t = useTranslations('product');
  const locale = useLocale();

  if (!price) {
    return (
      <p className={cn('text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>
        {t('noPrice')}
      </p>
    );
  }

  const amount = formatPrice(price.amount, locale, price.currency);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          'font-serif font-bold text-heading',
          size === 'lg' ? 'text-3xl' : 'text-lg',
          price.oldAmount && 'text-promo',
        )}
      >
        {from ? t('priceFrom', { price: amount }) : amount}
      </span>
      {price.oldAmount && (
        <s className={cn('text-muted-foreground', size === 'lg' ? 'text-lg' : 'text-sm')}>
          <span className="sr-only">{t('oldPrice')}: </span>
          {formatPrice(price.oldAmount, locale, price.currency)}
        </s>
      )}
    </p>
  );
}
