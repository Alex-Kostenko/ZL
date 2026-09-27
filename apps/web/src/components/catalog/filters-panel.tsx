'use client';

import type { FacetValueDto, NumberRangeDto, SelectedRangeDto } from '@ml/api-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ml/ui/components/accordion';
import { Button } from '@ml/ui/components/button';
import { Input } from '@ml/ui/components/input';
import { cn } from '@ml/ui/lib/utils';
import { Check, LoaderCircle } from 'lucide-react';
import { useLinkStatus } from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { formatNumber } from '@/lib/format';
import {
  type ListingState,
  listingHref,
  type NumberRange,
  setAttrRange,
  setPrice,
  toggleAttrValue,
  toggleBrand,
  toggleFlag,
} from '@/lib/listing-params';
import { useListing } from './listing-context';

const COLLAPSED_VALUES = 8;
const SEARCHABLE_VALUES = 12;
/** Attribute sections open by default (plus every section with a selection). */
const OPEN_ATTRIBUTES = 3;

/**
 * Facet filters. Every option is a real link (`rel=nofollow`, no prefetch): works before hydration
 * and never multiplies crawlable URLs. Ranges need JavaScript (a form with two numbers).
 */
export function FiltersPanel() {
  const { basePath, state, facets, hidden } = useListing();
  const t = useTranslations('listing');
  const href = (next: ListingState) => listingHref(basePath, next);

  const flags = (['inStock', 'sale', 'antidron'] as const).filter(
    (flag) => !hidden[flag] && (facets[flag].count > 0 || facets[flag].selected),
  );
  const brands = hidden.brand ? [] : facets.brands;
  const attributes = facets.attributes.filter((a) =>
    a.range ? a.range.min < a.range.max || a.selectedRange : a.values.length > 0,
  );

  const defaultOpen = [
    'flags',
    'price',
    'brand',
    ...attributes
      .filter(
        (a, index) =>
          index < OPEN_ATTRIBUTES || a.selectedRange || a.values.some((v) => v.selected),
      )
      .map((a) => `attr-${a.code}`),
  ];

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {flags.length > 0 && (
        <Section value="flags" title={t('availability')}>
          <ul className="space-y-0.5">
            {flags.map((flag) => (
              <li key={flag}>
                <FacetLink
                  href={href(toggleFlag(state, flag))}
                  label={t(flag)}
                  count={facets[flag].count}
                  selected={facets[flag].selected}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {facets.price && facets.price.min < facets.price.max && (
        <Section value="price" title={`${t('price')}, ₴`}>
          <RangeForm
            bounds={facets.price}
            selected={facets.selectedPrice}
            toHref={(range) => href(setPrice(state, range))}
          />
        </Section>
      )}

      {brands.length > 0 && (
        <Section value="brand" title={t('brand')}>
          <ValueList
            values={brands}
            searchable
            toHref={(value) => href(toggleBrand(state, value))}
          />
        </Section>
      )}

      {attributes.map((attribute) => (
        <Section
          key={attribute.code}
          value={`attr-${attribute.code}`}
          title={
            attribute.range && attribute.unit
              ? `${attribute.name}, ${attribute.unit}`
              : attribute.name
          }
        >
          {attribute.range ? (
            <RangeForm
              bounds={attribute.range}
              selected={attribute.selectedRange}
              toHref={(range) => href(setAttrRange(state, attribute.code, range))}
            />
          ) : (
            <ValueList
              values={attribute.values}
              toHref={(value) => href(toggleAttrValue(state, attribute.code, value))}
            />
          )}
        </Section>
      ))}
    </Accordion>
  );
}

function Section({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

function ValueList({
  values,
  searchable = false,
  toHref,
}: {
  values: FacetValueDto[];
  searchable?: boolean;
  toHref: (value: string) => string;
}) {
  const t = useTranslations('listing');
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const withSearch = searchable && values.length > SEARCHABLE_VALUES;

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (needle) return values.filter((v) => v.label.toLocaleLowerCase().includes(needle));
    if (expanded || values.length <= COLLAPSED_VALUES + 2) return values;
    // Selected options stay visible when the list is collapsed.
    const head = values.slice(0, COLLAPSED_VALUES);
    return [...head, ...values.slice(COLLAPSED_VALUES).filter((v) => v.selected)];
  }, [values, query, expanded]);

  return (
    <div className="space-y-2">
      {withSearch && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('findBrand')}
          aria-label={t('findBrand')}
          className="h-8"
        />
      )}
      <ul className={cn('space-y-0.5', expanded && !query && 'max-h-80 overflow-y-auto pr-1')}>
        {visible.map((value) => (
          <li key={value.value}>
            <FacetLink
              href={toHref(value.value)}
              label={value.label}
              count={value.count}
              selected={value.selected}
            />
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="text-muted-foreground">{t('nothingFound')}</p>}
      {!query && values.length > COLLAPSED_VALUES + 2 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {expanded ? t('showLess') : t('showAll', { count: values.length })}
        </button>
      )}
    </div>
  );
}

/** Checkbox-looking link. Options that would give no results are shown disabled. */
function FacetLink({
  href,
  label,
  count,
  selected,
}: {
  href: string;
  label: string;
  count: number;
  selected: boolean;
}) {
  const locale = useLocale();
  const content = (
    <>
      <FacetCheckbox selected={selected} />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {!selected && (
        <span className="text-xs text-muted-foreground">{formatNumber(count, locale)}</span>
      )}
    </>
  );
  const row = 'flex items-start gap-2.5 rounded-sm py-1.5 text-sm';

  if (count === 0 && !selected) {
    return <span className={cn(row, 'cursor-not-allowed opacity-45')}>{content}</span>;
  }
  return (
    <Link
      href={href}
      rel="nofollow"
      prefetch={false}
      scroll={false}
      // A link, not role=checkbox (Space would not toggle it); the state is announced as "current".
      aria-current={selected ? 'true' : undefined}
      className={cn(
        row,
        'outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )}
    >
      {content}
    </Link>
  );
}

function FacetCheckbox({ selected }: { selected: boolean }) {
  // Must render inside the Link: shows a spinner while that link's navigation is pending.
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        'mt-px flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-card',
        selected && 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {pending ? (
        <LoaderCircle className="size-3 animate-spin" />
      ) : (
        selected && <Check className="size-3" strokeWidth={3} />
      )}
    </span>
  );
}

function RangeForm({
  bounds,
  selected,
  toHref,
}: {
  bounds: NumberRangeDto;
  selected: SelectedRangeDto | null;
  toHref: (range: NumberRange | null) => string;
}) {
  const t = useTranslations('listing');
  const router = useRouter();
  const id = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (name: string) => {
      const raw = String(data.get(name) ?? '')
        .replace(',', '.')
        .trim();
      return raw === '' ? null : Number(raw);
    };
    router.push(toHref({ min: read('min'), max: read('max') }), { scroll: false });
  };

  return (
    // Re-mounts with fresh defaults when the applied range changes.
    <form key={`${selected?.min}-${selected?.max}`} onSubmit={submit} className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          {t('from')}
        </label>
        <Input
          id={`${id}-min`}
          name="min"
          inputMode="decimal"
          defaultValue={selected?.min ?? ''}
          placeholder={`${t('from')} ${Math.floor(bounds.min)}`}
          className="h-8"
        />
        <span aria-hidden className="text-muted-foreground">
          –
        </span>
        <label htmlFor={`${id}-max`} className="sr-only">
          {t('to')}
        </label>
        <Input
          id={`${id}-max`}
          name="max"
          inputMode="decimal"
          defaultValue={selected?.max ?? ''}
          placeholder={`${t('to')} ${Math.ceil(bounds.max)}`}
          className="h-8"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" className="w-full">
        {t('apply')}
      </Button>
    </form>
  );
}
