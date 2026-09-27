import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCategoryTree } from '@/lib/catalog';
import { categoryHref } from '@/lib/routes';
import { FOOTER_LINKS, INFO_LINKS, type NavLink, resolveLinks, SHOWCASE_LINKS } from './nav-links';

// Ink section in both themes (brand.md: footer is dark), so raw brand colors are used here.
export async function SiteFooter() {
  const locale = await getLocale();
  const [tree, t, tNav, tMeta] = await Promise.all([
    getCategoryTree(locale),
    getTranslations('footer'),
    getTranslations('nav'),
    getTranslations('meta'),
  ]);
  const catalog: NavLink[] = [
    ...tree.map((root) => ({ href: categoryHref(root.path), label: root.name })),
    ...resolveLinks(
      SHOWCASE_LINKS.filter((link) => link.href !== '/blog'),
      tNav,
    ),
  ];

  return (
    <footer className="border-t border-white/10 bg-ink text-sand">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl font-bold text-paper">{tMeta('siteName')}</p>
          <p className="eyebrow mt-3">{t('tagline')}</p>
          <p className="mt-4 max-w-xs text-sm text-stone">{t('about')}</p>
        </div>
        <FooterColumn title={t('catalog')} links={catalog} />
        <FooterColumn title={t('customers')} links={resolveLinks(INFO_LINKS, tNav)} />
        <FooterColumn title={t('useful')} links={resolveLinks(FOOTER_LINKS, tNav)} />
      </div>
      {/* TODO(13.3): contacts and social links from the Settings API. */}
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-stone">
          © {new Date().getFullYear()} {tMeta('siteName')}
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
