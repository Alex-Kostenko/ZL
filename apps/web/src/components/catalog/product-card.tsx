import type { ProductListItemDto } from '@ml/api-client';
import { Badge } from '@ml/ui/components/badge';
import { cn } from '@ml/ui/lib/utils';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatPrice } from '@/lib/format';
import { brandHref, productHref } from '@/lib/routes';

// Grid: 2 columns on phones, 3 from md, 4 from xl (container 1240 px).
const IMAGE_SIZES = '(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw';

/**
 * Listing tile. The whole card is clickable through the title link's overlay; the brand link sits
 * above it. `preload` — first row of the first screen (LCP candidate).
 */
export function ProductCard({
  product,
  preload = false,
}: {
  product: ProductListItemDto;
  preload?: boolean;
}) {
  const t = useTranslations('product');
  const tListing = useTranslations('listing');
  const locale = useLocale();
  const { price } = product;

  return (
    <article className="group relative flex flex-col rounded-md border bg-card p-3 transition-colors hover:border-primary/60 sm:p-4">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-sm bg-muted">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes={IMAGE_SIZES}
            preload={preload}
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera aria-hidden className="size-8 opacity-50" />
            <span className="text-xs">{t('noImage')}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {price?.discountPercent ? (
            <Badge variant="promo">−{price.discountPercent}%</Badge>
          ) : (
            product.isSale && <Badge variant="promo">{tListing('sale')}</Badge>
          )}
          {product.isAntidron && <Badge variant="secondary">{tListing('antidron')}</Badge>}
        </div>
      </div>

      {product.brand && (
        <Link
          href={brandHref(product.brand.slug)}
          className="relative z-10 mb-1 w-fit text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase hover:text-primary"
        >
          {product.brand.name}
        </Link>
      )}
      <h3 className="mb-3 line-clamp-3 font-sans text-sm leading-snug font-normal text-foreground">
        <Link
          href={productHref(product.slug)}
          className="after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none after:focus-visible:rounded-md after:focus-visible:ring-[3px] after:focus-visible:ring-ring/50"
        >
          {product.title}
        </Link>
      </h3>

      <div className="mt-auto">
        {price ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                'font-serif text-lg font-bold text-heading',
                price.oldAmount && 'text-promo',
              )}
            >
              {product.hasPriceRange
                ? t('priceFrom', { price: formatPrice(price.amount, locale, price.currency) })
                : formatPrice(price.amount, locale, price.currency)}
            </span>
            {price.oldAmount && (
              <s className="text-sm text-muted-foreground">
                <span className="sr-only">{t('oldPrice')}: </span>
                {formatPrice(price.oldAmount, locale, price.currency)}
              </s>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noPrice')}</p>
        )}
        <p
          className={cn('mt-1 text-xs', product.inStock ? 'text-primary' : 'text-muted-foreground')}
        >
          {product.inStock ? t('inStock') : t('outOfStock')}
        </p>
      </div>
    </article>
  );
}
