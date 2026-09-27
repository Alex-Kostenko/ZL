import type { SearchFacetsDto, SearchResultDto } from '@ml/api-client';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatNumber, formatPrice } from '@/lib/format';
import {
  activeFilterCount,
  clearFilters,
  type ListingState,
  listingHref,
  type NumberRange,
  setAttrRange,
  setPrice,
  toggleAttrValue,
  toggleBrand,
  toggleFlag,
} from '@/lib/listing-params';
import { FiltersPanel } from './filters-panel';
import { type HiddenFilters, ListingProvider } from './listing-context';
import { MobileFilters, SortSelect } from './listing-controls';
import { ListingPagination } from './listing-pagination';
import { ProductCard } from './product-card';

/** Products in the first grid row get `preload` (LCP). */
const PRELOAD_CARDS = 4;

/**
 * Filters + toolbar + product grid + pagination for any listing page (category, brand, showcases,
 * search). The page renders its own heading and breadcrumbs above it.
 */
export function ProductListing({
  basePath,
  state,
  result,
  hidden,
  emptyText,
}: {
  /** Locale-free path of the listing, e.g. `/category/zbroia`. */
  basePath: string;
  state: ListingState;
  result: SearchResultDto;
  hidden?: HiddenFilters;
  /** Empty state without filters; defaults to "no products in this section". */
  emptyText?: string;
}) {
  const t = useTranslations('listing');
  const filtered = activeFilterCount(state) > 0;

  return (
    <ListingProvider
      basePath={basePath}
      state={state}
      facets={result.facets}
      hidden={hidden ?? {}}
      total={result.total}
    >
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <FiltersPanel />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
              {t('products', { count: result.total })}
            </p>
            <MobileFilters />
            <SortSelect />
          </div>

          {filtered && (
            <ActiveFilters
              basePath={basePath}
              state={state}
              facets={result.facets}
              hidden={hidden}
            />
          )}

          {result.degraded && (
            <p
              role="status"
              className="mb-4 rounded-md border border-sand bg-secondary px-4 py-3 text-sm text-secondary-foreground"
            >
              {t('degraded')}
            </p>
          )}

          {result.items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {result.items.map((product, index) => (
                <li key={product.id} className="flex">
                  <ProductCard product={product} preload={index < PRELOAD_CARDS} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed px-6 py-16 text-center">
              <p className="font-serif text-xl font-bold text-heading">{t('emptyTitle')}</p>
              <p className="mt-2 text-muted-foreground">
                {filtered ? t('emptyFiltered') : (emptyText ?? t('emptyCategory'))}
              </p>
              {filtered && (
                <Link
                  href={listingHref(basePath, clearFilters(state))}
                  className="mt-4 inline-block font-medium text-primary hover:underline"
                >
                  {t('clearAll')}
                </Link>
              )}
            </div>
          )}

          <ListingPagination basePath={basePath} state={state} totalPages={result.totalPages} />
        </div>
      </div>
    </ListingProvider>
  );
}

type Translate = ReturnType<typeof useTranslations<'listing'>>;

function rangeLabel(
  t: Translate,
  locale: string,
  range: NumberRange,
  unit: string | null,
  money = false,
) {
  const fmt = (n: number) => (money ? formatPrice(n, locale) : formatNumber(n, locale));
  const suffix = unit && !money ? ` ${unit}` : '';
  if (range.min !== null && range.max !== null)
    return `${fmt(range.min)} – ${fmt(range.max)}${suffix}`;
  return range.min !== null
    ? t('rangeFrom', { value: `${fmt(range.min)}${suffix}` })
    : t('rangeTo', { value: `${fmt(range.max!)}${suffix}` });
}

/** Applied filters as removable chips. */
function ActiveFilters({
  basePath,
  state,
  facets,
  hidden,
}: {
  basePath: string;
  state: ListingState;
  facets: SearchFacetsDto;
  hidden?: HiddenFilters;
}) {
  const t = useTranslations('listing');
  const locale = useLocale();
  const chips: { key: string; label: string; href: string }[] = [];
  const href = (next: ListingState) => listingHref(basePath, next);

  for (const flag of ['inStock', 'sale', 'antidron'] as const) {
    if (state[flag] && !hidden?.[flag]) {
      chips.push({ key: flag, label: t(flag), href: href(toggleFlag(state, flag)) });
    }
  }
  if (state.price) {
    chips.push({
      key: 'price',
      label: `${t('price')}: ${rangeLabel(t, locale, state.price, null, true)}`,
      href: href(setPrice(state, null)),
    });
  }
  if (!hidden?.brand) {
    for (const slug of state.brands) {
      const label = facets.brands.find((b) => b.value === slug)?.label ?? slug;
      chips.push({ key: `brand-${slug}`, label, href: href(toggleBrand(state, slug)) });
    }
  }
  for (const [code, value] of Object.entries(state.attrs)) {
    const facet = facets.attributes.find((a) => a.code === code);
    const name = facet?.name ?? code;
    if (Array.isArray(value)) {
      for (const option of value) {
        const label = facet?.values.find((v) => v.value === option)?.label ?? option;
        chips.push({
          key: `${code}-${option}`,
          label: `${name}: ${label}`,
          href: href(toggleAttrValue(state, code, option)),
        });
      }
    } else {
      chips.push({
        key: code,
        label: `${name}: ${rangeLabel(t, locale, value, facet?.unit ?? null)}`,
        href: href(setAttrRange(state, code, null)),
      });
    }
  }
  if (chips.length === 0) return null;

  return (
    <ul className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            rel="nofollow"
            prefetch={false}
            scroll={false}
            aria-label={t('removeFilter', { name: chip.label })}
            className="inline-flex items-center gap-1.5 rounded-sm border bg-card py-1 pr-2 pl-3 text-sm hover:border-primary hover:text-primary"
          >
            {chip.label}
            <X aria-hidden className="size-3.5" />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={href(clearFilters(state))}
          rel="nofollow"
          scroll={false}
          className="px-2 text-sm font-medium text-primary hover:underline"
        >
          {t('clearAll')}
        </Link>
      </li>
    </ul>
  );
}
