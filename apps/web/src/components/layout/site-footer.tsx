import Link from 'next/link';
import { getCategoryTree } from '@/lib/catalog';
import { categoryHref } from '@/lib/routes';
import { INFO_LINKS, type NavLink, SHOWCASE_LINKS } from './nav-links';

// Ink section in both themes (brand.md: footer is dark), so raw brand colors are used here.
export async function SiteFooter() {
  const tree = await getCategoryTree();
  const catalog: NavLink[] = [
    ...tree.map((root) => ({ href: categoryHref(root.path), label: root.name })),
    ...SHOWCASE_LINKS.filter((link) => link.href !== '/blog'),
  ];

  return (
    <footer className="border-t border-white/10 bg-ink text-sand">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl font-bold text-paper">Мисливська лавка</p>
          <p className="eyebrow mt-3">Спорядження, якому довіряють.</p>
          <p className="mt-4 max-w-xs text-sm text-stone">
            Товари для полювання, риболовлі та активного відпочинку: 50 000+ позицій, 500+ брендів.
          </p>
        </div>
        <FooterColumn title="Каталог" links={catalog} />
        <FooterColumn title="Покупцям" links={INFO_LINKS} />
        <FooterColumn
          title="Корисне"
          links={[
            { href: '/blog', label: 'Новини та статті' },
            { href: '/account', label: 'Особистий кабінет' },
            { href: '/cart', label: 'Кошик' },
          ]}
        />
      </div>
      {/* TODO(13.3): contacts and social links from the Settings API. */}
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-stone">
          © {new Date().getFullYear()} Мисливська лавка
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-sans text-xs font-bold tracking-[0.16em] text-paper uppercase">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-paper hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
