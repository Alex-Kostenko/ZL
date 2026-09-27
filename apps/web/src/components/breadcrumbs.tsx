import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { JsonLd } from '@/components/json-ld';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo';
import { breadcrumbListLd } from '@/lib/structured-data';

// Server component (absolute URLs read the site URL from env).

export interface Crumb {
  name: string;
  /** Locale-free path; omitted for the current page. */
  href?: string;
}

/**
 * Home › … › current page. The last crumb is the current page (not a link). Emits the matching
 * BreadcrumbList JSON-LD, so structured data never differs from the visible trail.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('breadcrumbs');
  const locale = useLocale() as Locale;
  const crumbs: Crumb[] = [{ name: t('home'), href: '/' }, ...items];

  return (
    <nav aria-label={t('label')} className="text-sm text-muted-foreground">
      <JsonLd
        data={breadcrumbListLd(
          crumbs.map((crumb, index) => ({
            name: crumb.name,
            url:
              crumb.href && index < crumbs.length - 1 ? absoluteUrl(crumb.href, locale) : undefined,
          })),
        )}
      />
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${index}-${crumb.name}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0" />}
              {last || !crumb.href ? (
                <span aria-current={last ? 'page' : undefined} className="text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-primary hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
