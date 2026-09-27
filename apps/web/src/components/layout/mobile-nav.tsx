'use client';

import type { CategoryNodeDto } from '@ml/api-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ml/ui/components/accordion';
import { Button } from '@ml/ui/components/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ml/ui/components/sheet';
import { cn } from '@ml/ui/lib/utils';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { categoryHref } from '@/lib/routes';
import type { NavLink } from './nav-links';

/** Mobile / tablet navigation: left drawer with the category tree as nested accordions. */
export function MobileNav({
  tree,
  showcase,
  info,
}: {
  tree: CategoryNodeDto[];
  showcase: NavLink[];
  info: NavLink[];
}) {
  const t = useTranslations('layout');
  const tMeta = useTranslations('meta');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('menu')} className="-ml-2 lg:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        closeLabel={t('closeMenu')}
        className="w-[88vw] gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-serif text-lg">{tMeta('siteName')}</SheetTitle>
        </SheetHeader>

        <nav aria-label={t('catalog')} className="flex-1 overflow-y-auto px-5 pb-8">
          <Accordion type="single" collapsible>
            {tree.map((root) => (
              <AccordionItem key={root.id} value={root.id}>
                <AccordionTrigger className="py-3.5 text-[13px] font-semibold tracking-[0.05em] uppercase hover:no-underline">
                  {root.name}
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <DrawerLink href={categoryHref(root.path)} className="eyebrow py-2">
                    {t('allProducts')}
                  </DrawerLink>
                  <Accordion type="single" collapsible>
                    {root.children.map((group) =>
                      group.children.length > 0 ? (
                        <AccordionItem key={group.id} value={group.id} className="border-b-0">
                          <AccordionTrigger className="py-2.5 font-medium hover:no-underline">
                            {group.name}
                          </AccordionTrigger>
                          <AccordionContent className="border-l pb-2 pl-4">
                            <DrawerLink href={categoryHref(group.path)} className="font-medium">
                              {t('allOf', { name: group.name })}
                            </DrawerLink>
                            {group.children.map((leaf) => (
                              <DrawerLink
                                key={leaf.id}
                                href={categoryHref(leaf.path)}
                                className="text-muted-foreground"
                              >
                                {leaf.name}
                              </DrawerLink>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      ) : (
                        <DrawerLink
                          key={group.id}
                          href={categoryHref(group.path)}
                          className="py-2.5 font-medium"
                        >
                          {group.name}
                        </DrawerLink>
                      ),
                    )}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="border-b py-2">
            {showcase.map((link) => (
              <li key={link.href}>
                <DrawerLink
                  href={link.href}
                  className={cn(
                    'py-3 text-[13px] font-semibold tracking-[0.05em] uppercase',
                    link.promo && 'text-promo',
                  )}
                >
                  {link.label}
                </DrawerLink>
              </li>
            ))}
          </ul>

          <ul className="py-3">
            {info.map((link) => (
              <li key={link.href}>
                <DrawerLink href={link.href} className="text-muted-foreground">
                  {link.label}
                </DrawerLink>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Link that also closes the drawer (client navigation keeps the Sheet mounted). */
function DrawerLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link href={href} className={cn('block py-2 text-sm hover:text-primary', className)}>
        {children}
      </Link>
    </SheetClose>
  );
}
