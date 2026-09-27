'use client';

import { Button } from '@ml/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ml/ui/components/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ml/ui/components/sheet';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import {
  activeFilterCount,
  clearFilters,
  LISTING_SORTS,
  type ListingSort,
  listingHref,
  withSort,
} from '@/lib/listing-params';
import { FiltersPanel } from './filters-panel';
import { useListing } from './listing-context';

/**
 * Filters drawer for phones and tablets. Filter links navigate while the drawer stays open
 * (client navigation keeps it mounted), so several filters can be picked in a row.
 */
export function MobileFilters() {
  const { basePath, state, total } = useListing();
  const t = useTranslations('listing');
  const count = activeFilterCount(state);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal />
          {t('filters')}
          {count > 0 && (
            <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={t('closeFilters')}
        className="w-full gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-serif text-lg">{t('filters')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5">
          <FiltersPanel />
        </div>
        <SheetFooter className="flex-row border-t px-5 py-4">
          {count > 0 && (
            <Button variant="ghost" asChild>
              <Link href={listingHref(basePath, clearFilters(state))} scroll={false}>
                {t('clearAll')}
              </Link>
            </Button>
          )}
          <SheetClose asChild>
            <Button className="flex-1">{t('showResults', { count: total })}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SortSelect() {
  const { basePath, state } = useListing();
  const t = useTranslations('listing');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={state.sort}
      onValueChange={(sort) =>
        startTransition(() =>
          router.push(listingHref(basePath, withSort(state, sort as ListingSort)), {
            scroll: false,
          }),
        )
      }
    >
      <SelectTrigger
        aria-label={t('sortLabel')}
        className="min-w-48 bg-card"
        data-pending={pending || undefined}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LISTING_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {t(`sort.${sort}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
