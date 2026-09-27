import { buttonVariants } from '@ml/ui/components/button';
import { cn } from '@ml/ui/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  type ListingState,
  listingHref,
  MAX_PAGE,
  paginationRange,
  withPage,
} from '@/lib/listing-params';

/** Plain links (crawlable, work without JavaScript); filters are kept in every URL. */
export function ListingPagination({
  basePath,
  state,
  totalPages,
}: {
  basePath: string;
  state: ListingState;
  totalPages: number;
}) {
  const t = useTranslations('pagination');
  const total = Math.min(totalPages, MAX_PAGE);
  if (total <= 1) return null;

  const current = state.page;
  const href = (page: number) => listingHref(basePath, withPage(state, page));
  const item = 'size-9 px-0 text-sm tracking-normal normal-case';

  return (
    <nav aria-label={t('label')} className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {current > 1 ? (
            <Link
              href={href(current - 1)}
              aria-label={t('previous')}
              className={cn(buttonVariants({ variant: 'ghost' }), item)}
            >
              <ChevronLeft />
            </Link>
          ) : (
            <span
              aria-hidden
              className={cn(buttonVariants({ variant: 'ghost' }), item, 'opacity-40')}
            >
              <ChevronLeft />
            </span>
          )}
        </li>
        {paginationRange(current, total).map((page, index) =>
          page === null ? (
            <li key={`gap-${index}`} aria-hidden className="w-6 text-center text-muted-foreground">
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={href(page)}
                aria-label={t('page', { page })}
                aria-current={page === current ? 'page' : undefined}
                className={cn(
                  buttonVariants({ variant: page === current ? 'default' : 'ghost' }),
                  item,
                  'w-auto min-w-9 px-2',
                )}
              >
                {page}
              </Link>
            </li>
          ),
        )}
        <li>
          {current < total ? (
            <Link
              href={href(current + 1)}
              aria-label={t('next')}
              className={cn(buttonVariants({ variant: 'ghost' }), item)}
            >
              <ChevronRight />
            </Link>
          ) : (
            <span
              aria-hidden
              className={cn(buttonVariants({ variant: 'ghost' }), item, 'opacity-40')}
            >
              <ChevronRight />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
