'use client';

import type { ProductImageDto } from '@ml/api-client';
import { cn } from '@ml/ui/lib/utils';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useVariant } from './variant-context';

// Gallery column: full width on phones, ~600 px next to the purchase panel from lg.
const MAIN_SIZES = '(min-width: 1280px) 720px, (min-width: 1024px) 55vw, 100vw';

/**
 * Main photo + thumbnails. Picking a variant shows its photo (if it has one) until the shopper
 * clicks another thumbnail. The main photo is the LCP element: `preload`.
 */
export function ProductGallery({ images }: { images: ProductImageDto[] }) {
  const t = useTranslations('product');
  const { variant } = useVariant();
  const [picked, setPicked] = useState<{ variantId?: string; index: number } | null>(null);

  const variantIndex = images.findIndex(
    (image) => image.variantId && image.variantId === variant?.id,
  );
  const active =
    picked && picked.variantId === variant?.id ? picked.index : Math.max(variantIndex, 0);
  const image = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-md border bg-card">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes={MAIN_SIZES}
            preload
            className="object-contain p-4"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera aria-hidden className="size-14 opacity-50" />
            <span className="text-sm">{t('noImage')}</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((thumb, index) => (
            <li key={thumb.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setPicked({ variantId: variant?.id, index })}
                aria-label={t('showImage', { index: index + 1, total: images.length })}
                aria-current={index === active}
                className={cn(
                  'relative block size-16 overflow-hidden rounded-sm border bg-card sm:size-20',
                  index === active
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'hover:border-primary/60',
                )}
              >
                <Image src={thumb.url} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
