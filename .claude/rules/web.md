---
paths:
  - "apps/web/**"
  - "packages/ui/**"
---
# Frontend (Next.js)
- Дані лише через `packages/api-client`; ніяких ручних типів бекенду, ніяких прямих звернень до БД/Tria.
- Storefront: Server Components + SSR/ISR; основний контент у HTML без JS (SEO/GEO). Admin: окремий layout, client-heavy ок.
- UI: shadcn/ui + Radix + Tailwind + Lucide. Кольори/шрифти тільки через tokens з `.claude/docs/brand.md`.
- `packages/ui` — без доменної логіки. Admin-таблиці — TanStack Table, server-side pagination/filter/sort.
- Тексти UI через i18n (uk default), не хардкодити. Бізнес-налаштування — з API (Settings), не з коду.
- Зображення: next/image, AVIF/WebP, ніколи оригінали в картках. Цілі: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Next.js 16 відрізняється від старих версій (proxy.ts замість middleware, `preload` замість `priority` у next/image тощо) — при сумнівах читати `node_modules/next/dist/docs/`.
- Деталі: `.claude/docs/spec/frontend.md`, `content-seo-geo.md`.
