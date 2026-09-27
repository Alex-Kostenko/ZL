import { Button } from '@ml/ui/components/button';
import { ShoppingCart, User } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/i18n/navigation';
import { getCategoryTree } from '@/lib/catalog';
import { Logo } from './logo';
import { MegaMenu } from './mega-menu';
import { MobileNav } from './mobile-nav';
import { INFO_LINKS, resolveLinks, SHOWCASE_LINKS } from './nav-links';
import { SearchForm } from './search-form';

export async function SiteHeader() {
  const locale = await getLocale();
  const [tree, t] = await Promise.all([getCategoryTree(locale), getTranslations('nav')]);
  const showcase = resolveLinks(SHOWCASE_LINKS, t);

  return (
    <header className="z-40 border-b bg-background lg:sticky lg:top-0">
      <div className="container-page flex h-16 items-center gap-3 md:gap-6">
        <MobileNav tree={tree} showcase={showcase} info={resolveLinks(INFO_LINKS, t)} />
        <Logo />
        <SearchForm className="mx-auto hidden max-w-xl flex-1 md:block" />
        <div className="ml-auto flex items-center md:ml-0">
          <LanguageSwitcher />
          <ThemeToggle />
          {/* TODO(12.x): account state and cart count. */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account" aria-label={t('account')}>
              <User className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="-mr-2">
            <Link href="/cart" aria-label={t('cart')}>
              <ShoppingCart className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchForm />
      </div>
      <div className="relative hidden border-t lg:block">
        <MegaMenu tree={tree} links={showcase} />
      </div>
    </header>
  );
}
