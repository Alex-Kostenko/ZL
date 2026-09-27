// Storefront URL builders. Safe for client components (no server-only imports).
// Paths are locale-free: render them with `Link` from `@/i18n/navigation`, which adds /ru, /en.

export const categoryHref = (path: string) => `/category/${path}`;
