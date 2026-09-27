// Static storefront links (showcases and info pages). Categories come from the API.
// TODO(8.3): labels move to i18n messages.

export interface NavLink {
  href: string;
  label: string;
  /** Rendered in the promo color (sale). */
  promo?: boolean;
}

/** Showcase pages next to category roots in the main navigation (categories.md). */
export const SHOWCASE_LINKS: NavLink[] = [
  { href: '/antidron', label: 'Антидрон' },
  { href: '/sale', label: 'Розпродаж', promo: true },
  { href: '/brands', label: 'Бренди' },
  { href: '/blog', label: 'Новини' },
];

export const INFO_LINKS: NavLink[] = [
  { href: '/delivery', label: 'Доставка' },
  { href: '/payment', label: 'Оплата' },
  { href: '/warranty', label: 'Гарантія та повернення' },
  { href: '/contacts', label: 'Контакти' },
  { href: '/about', label: 'Про магазин' },
];
