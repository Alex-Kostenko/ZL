'use client';

import type { SuggestResultDto } from '@ml/api-client';
import { Input } from '@ml/ui/components/input';
import { cn } from '@ml/ui/lib/utils';
import { Camera, Folder, Search, Tag } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from 'react';
import { getPathname, Link, useRouter } from '@/i18n/navigation';
import { formatPrice } from '@/lib/format';
import { brandHref, categoryHref, productHref } from '@/lib/routes';

/** The dropdown opens from this many characters (same limit as `/api/suggest`). */
const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

interface Option {
  href: string;
  content: ReactNode;
}

/**
 * Header search: a plain GET form to /search (works without JavaScript) enhanced with an
 * autocomplete combobox (products, categories, brands) fed by the same-origin `/api/suggest`.
 */
export function SearchForm({ className }: { className?: string }) {
  const t = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;

  const [query, setQuery] = useState('');
  const [data, setData] = useState<SuggestResultDto | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = query.trim();
  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?${new URLSearchParams({ q, locale })}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<SuggestResultDto>) : null))
        .then((result) => {
          setData(result);
          setActive(-1);
        })
        .catch(() => {}); // aborted or offline: keep the previous suggestions
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);

  const suggestions = q.length >= MIN_QUERY ? data : null;
  const groups = suggestions ? buildGroups(suggestions, locale, t) : [];
  const options = groups.flatMap((g) => g.options);
  const allResults: Option = {
    href: `/search?q=${encodeURIComponent(q)}`,
    content: <span className="font-medium text-primary">{t('allResults', { query: q })}</span>,
  };
  const flat = suggestions ? [...options, allResults] : [];
  const expanded = open && suggestions !== null;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!q) return;
    go(`/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (flat.length === 0) return;
      event.preventDefault();
      setOpen(true);
      // Cycles through -1 (the input itself) and every option.
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const states = flat.length + 1;
      setActive((current) => ((current + 1 + step + states) % states) - 1);
    } else if (event.key === 'Enter' && expanded && active >= 0 && flat[active]) {
      event.preventDefault();
      go(flat[active].href);
    }
  }

  /** Index of each group's first option in `flat` (ids for keyboard navigation). */
  const starts = groups.map((_, g) =>
    groups.slice(0, g).reduce((sum, group) => sum + group.options.length, 0),
  );

  const option = (item: Option, i: number) => {
    return (
      <li
        key={item.href}
        id={`${id}-opt-${i}`}
        role="option"
        aria-selected={i === active}
        onMouseEnter={() => setActive(i)}
      >
        <Link
          href={item.href}
          tabIndex={-1}
          onClick={close}
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-sm',
            i === active && 'bg-accent text-accent-foreground',
          )}
        >
          {item.content}
        </Link>
      </li>
    );
  };

  return (
    <form
      action={getPathname({ href: '/search', locale })}
      role="search"
      onSubmit={onSubmit}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      className={cn('relative', className)}
    >
      <Input
        type="search"
        name="q"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-label={t('label')}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
        placeholder={t('placeholder')}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={200}
        className="h-10 bg-card pr-11 dark:bg-card"
      />
      <button
        type="submit"
        aria-label={t('submit')}
        className="absolute top-0 right-0 flex size-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Search className="size-4" />
      </button>

      <div
        className={cn(
          'absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg',
          !expanded && 'hidden',
        )}
      >
        <ul id={listId} role="listbox" aria-label={t('suggestions')} className="py-1">
          {groups.map((group, g) => (
            <li key={group.label} role="presentation">
              <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                {group.label}
              </p>
              <ul role="group" aria-label={group.label}>
                {group.options.map((item, j) => option(item, starts[g]! + j))}
              </ul>
            </li>
          ))}
          {suggestions && options.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
              {suggestions.degraded ? t('unavailable') : t('nothingFound', { query: q })}
            </li>
          )}
          {suggestions && (
            <li role="presentation" className="mt-1 border-t pt-1">
              <ul role="group">{option(allResults, options.length)}</ul>
            </li>
          )}
        </ul>
      </div>
    </form>
  );
}

type Translate = ReturnType<typeof useTranslations<'search'>>;

function buildGroups(data: SuggestResultDto, locale: string, t: Translate) {
  const groups: { label: string; options: Option[] }[] = [];

  if (data.products.length > 0) {
    groups.push({
      label: t('products'),
      options: data.products.map((product) => ({
        href: productHref(product.slug),
        content: (
          <>
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-card">
              {product.image ? (
                <Image
                  src={product.image.url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              ) : (
                <Camera aria-hidden className="size-4 text-muted-foreground opacity-60" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2">{product.title}</span>
              {product.price && (
                <span
                  className={cn(
                    'text-xs font-semibold',
                    product.price.oldAmount ? 'text-promo' : 'text-heading',
                  )}
                >
                  {product.hasPriceRange
                    ? t('priceFrom', {
                        price: formatPrice(product.price.amount, locale, product.price.currency),
                      })
                    : formatPrice(product.price.amount, locale, product.price.currency)}
                </span>
              )}
            </span>
          </>
        ),
      })),
    });
  }
  if (data.categories.length > 0) {
    groups.push({
      label: t('categories'),
      options: data.categories.map((category) => ({
        href: categoryHref(category.path),
        content: (
          <>
            <Folder aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {category.name}
          </>
        ),
      })),
    });
  }
  if (data.brands.length > 0) {
    groups.push({
      label: t('brands'),
      options: data.brands.map((brand) => ({
        href: brandHref(brand.slug),
        content: (
          <>
            <Tag aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {brand.name}
          </>
        ),
      })),
    });
  }
  return groups;
}
