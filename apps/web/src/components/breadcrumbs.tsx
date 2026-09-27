import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export interface Crumb {
  name: string;
  /** Locale-free path; omitted for the current page. */
  href?: string;
}

/** Home › … › current page. The last crumb is the current page (not a link). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('breadcrumbs');
  const crumbs: Crumb[] = [{ name: t('home'), href: '/' }, ...items];

  return (
    <nav aria-label={t('label')} className="text-sm text-muted-foreground">
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
