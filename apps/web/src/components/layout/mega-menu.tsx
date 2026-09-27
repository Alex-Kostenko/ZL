'use client';

import type { CategoryNodeDto } from '@ml/api-client';
import { cn } from '@ml/ui/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NavigationMenu as Nav } from 'radix-ui';
import { categoryHref } from '@/lib/routes';
import type { NavLink } from './nav-links';

const itemClass =
  'inline-flex h-11 items-center gap-1 border-b-2 border-transparent px-3 text-[13px] font-semibold tracking-[0.05em] uppercase outline-none transition-colors hover:text-primary focus-visible:text-primary data-[state=open]:border-bronze data-[state=open]:text-primary';

/**
 * Desktop main navigation: category roots open a full-width panel with levels 2–3.
 * Panels are force-mounted, so every category link is in the server HTML (crawlable,
 * works before hydration) and only hidden while closed.
 */
export function MegaMenu({ tree, links }: { tree: CategoryNodeDto[]; links: NavLink[] }) {
  const t = useTranslations('layout');
  return (
    <Nav.Root delayDuration={150} aria-label={t('catalog')}>
      <Nav.List className="container-page flex items-center [&>li:first-child]:-ml-3">
        {tree.map((root) => (
          <Nav.Item key={root.id} value={root.id}>
            <Nav.Trigger className={cn(itemClass, 'group')}>
              {root.name}
              <ChevronDown
                aria-hidden
                className="size-3.5 transition-transform group-data-[state=open]:rotate-180"
              />
            </Nav.Trigger>
            <Nav.Content
              forceMount
              className="absolute inset-x-0 top-full z-40 border-y bg-popover text-popover-foreground shadow-lg data-[state=closed]:hidden"
            >
              <CategoryPanel root={root} />
            </Nav.Content>
          </Nav.Item>
        ))}
        {links.map((link) => (
          <Nav.Item key={link.href}>
            <Nav.Link asChild>
              <Link href={link.href} className={cn(itemClass, link.promo && 'text-promo')}>
                {link.label}
              </Link>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav.List>
    </Nav.Root>
  );
}

function CategoryPanel({ root }: { root: CategoryNodeDto }) {
  const t = useTranslations('layout');
  return (
    <div className="container-page max-h-[calc(100vh-9rem)] overflow-y-auto py-8">
      <Nav.Link asChild>
        <Link href={categoryHref(root.path)} className="eyebrow hover:underline">
          {t('allProductsOf', { name: root.name })}
        </Link>
      </Nav.Link>
      <ul className="mt-5 columns-2 gap-8 lg:columns-3 xl:columns-4">
        {root.children.map((group) => (
          <li key={group.id} className="mb-6 break-inside-avoid">
            <Nav.Link asChild>
              <Link
                href={categoryHref(group.path)}
                className="font-semibold text-heading hover:text-primary"
              >
                {group.name}
              </Link>
            </Nav.Link>
            {group.children.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {group.children.map((leaf) => (
                  <li key={leaf.id}>
                    <Nav.Link asChild>
                      <Link
                        href={categoryHref(leaf.path)}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {leaf.name}
                      </Link>
                    </Nav.Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
