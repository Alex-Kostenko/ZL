// Static storefront links (showcases and info pages). Categories come from the API.

import type { Messages } from 'next-intl';

export interface NavLink {
  href: string;
  label: string;
  /** Rendered in the promo color (sale). */
  promo?: boolean;
}

/** Link definition; `label` is a key in the `nav` messages namespace. */
export interface NavLinkDef {
  href: string;
  label: keyof Messages['nav'];
  promo?: boolean;
}

/** Showcase pages next to category roots in the main navigation (categories.md). */
export const SHOWCASE_LINKS: NavLinkDef[] = [
  { href: '/antidron', label: 'antidron' },
  { href: '/sale', label: 'sale', promo: true },
  { href: '/brands', label: 'brands' },
  { href: '/blog', label: 'blog' },
];

export const INFO_LINKS: NavLinkDef[] = [
  { href: '/delivery', label: 'delivery' },
  { href: '/payment', label: 'payment' },
  { href: '/warranty', label: 'warranty' },
  { href: '/contacts', label: 'contacts' },
  { href: '/about', label: 'about' },
];

export const FOOTER_LINKS: NavLinkDef[] = [
  { href: '/blog', label: 'blogFull' },
  { href: '/account', label: 'account' },
  { href: '/cart', label: 'cart' },
];

export const resolveLinks = (
  defs: NavLinkDef[],
  t: (key: NavLinkDef['label']) => string,
): NavLink[] => defs.map((def) => ({ ...def, label: t(def.label) }));
