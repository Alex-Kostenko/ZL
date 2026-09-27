import { Button } from '@ml/ui/components/button';
import { ShoppingCart, User } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { getCategoryTree } from '@/lib/catalog';
import { Logo } from './logo';
import { MegaMenu } from './mega-menu';
import { MobileNav } from './mobile-nav';
import { INFO_LINKS, SHOWCASE_LINKS } from './nav-links';
import { SearchForm } from './search-form';

export async function SiteHeader() {
  const tree = await getCategoryTree();

  return (
    <header className="z-40 border-b bg-background lg:sticky lg:top-0">
      <div className="container-page flex h-16 items-center gap-3 md:gap-6">
        <MobileNav tree={tree} showcase={SHOWCASE_LINKS} info={INFO_LINKS} />
        <Logo />
        <SearchForm className="mx-auto hidden max-w-xl flex-1 md:block" />
        <div className="ml-auto flex items-center md:ml-0">
          <ThemeToggle />
          {/* TODO(12.x): account state and cart count. */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account" aria-label="Особистий кабінет">
              <User className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="-mr-2">
            <Link href="/cart" aria-label="Кошик">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchForm />
      </div>
      <div className="relative hidden border-t lg:block">
        <MegaMenu tree={tree} links={SHOWCASE_LINKS} />
      </div>
    </header>
  );
}
