import type { ProductListItemDto } from '@ml/api-client';
import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { Link } from '@/i18n/navigation';
import { ProductCard } from './product-card';

/**
 * Titled row of product cards (home page sections, "similar products"). 2 columns on phones,
 * 4 from lg, so 8 items fill whole rows. Renders nothing without products.
 */
export function ProductRail({
  title,
  products,
  more,
  className,
}: {
  title: string;
  products: ProductListItemDto[];
  /** "See all" link to the full listing (locale-free href). */
  more?: { href: string; label: string };
  className?: string;
}) {
  const headingId = useId();
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-2xl font-bold">
          {title}
        </h2>
        {more && (
          <Link
            href={more.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {more.label}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
