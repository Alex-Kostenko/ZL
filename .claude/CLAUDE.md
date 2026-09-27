# Мисливська лавка — інтернет-магазин

Headless e-commerce для полювання / риболовлі / активного відпочинку. 50 000+ товарів, 500+ брендів, ERP **Tria**.
Мова UI та спілкування: **українська**. Код, коментарі, коміти — англійською.

## Стек (фіксований, не пропонувати альтернатив без запиту)
TypeScript · **npm workspaces** + Turborepo (НЕ pnpm/yarn) · Next.js (App Router) + Tailwind + shadcn/ui + Radix + Lucide + TanStack Table ·
NestJS · PostgreSQL + **Prisma** (єдиний ORM) · Redis · BullMQ · Meilisearch · S3 + CloudFront · Cloudflare ·
GitHub Actions → AWS (ECR, OIDC). Середовища: тільки `development` і `production`.

## Структура monorepo
```
apps/web       Next.js: storefront + /admin (окремі layouts)
apps/api       NestJS: ЄДИНЕ джерело business logic, REST /api/v1, OpenAPI
apps/worker    BullMQ workers (опційно окремо)
packages/      ui, api-client (генерується з OpenAPI), types, validation, config, eslint-config, tsconfig
infrastructure/ docker, scripts
```

## Незламні правила
1. Next.js НЕ ходить у PostgreSQL / Tria напряму — тільки через API (згенерований клієнт, не ручні типи).
2. Backend валідує все; checkout перераховує ціну/знижку/наявність/доставку/total сам.
3. Tria — лише через `TriaAdapter`; доменна логіка не знає протоколу. Storefront працює, навіть коли Tria лежить.
4. Важкі операції (sync, import, reindex, images) — тільки BullMQ, ніколи в HTTP request.
5. Idempotency: sync, checkout, payment, створення замовлень, відправка в Tria.
6. Жодних `titleUk/titleRu`: переклади в `*_translations` (locale: uk default, ru, en).
7. Ціни й залишки — окремі домени (`prices`, `inventory` по складах; `available = quantity - reserved`).
8. `isSale` / `isAntidron` — прапорці товару, не категорії.
9. Атрибути — нормалізовані таблиці, не JSON у Product.
10. OrderItem зберігає snapshot (sku, title, price, qty, total).
11. RBAC перевіряє NestJS; admin: Argon2id + TOTP (секрет зашифрований) + HttpOnly cookies, не localStorage.
12. `/playground` і Swagger повністю вимкнені в production.
13. Не логувати паролі, токени, TOTP, платіжні секрети. Кожен request має `requestId`, кожен job — `jobId`.
14. Жодних MUI / Ant Design / інших UI-фреймворків. Файли — тільки S3, не в БД.

## Документація — читай ЛИШЕ потрібний файл
| Задача | Файл |
|---|---|
| Архітектура, модулі NestJS, API, стек | `.claude/docs/spec/architecture.md` |
| Storefront, routes, UI, CWV, зображення | `.claude/docs/spec/frontend.md` |
| Категорії, товари, варіанти, атрибути, бренди, ціни, склад, пошук, імпорт, i18n | `.claude/docs/spec/catalog.md` |
| Admin, auth, TOTP, RBAC, аудит, безпека, налаштування, секрети | `.claude/docs/spec/admin-auth.md` |
| CMS, медіа, SEO, sitemap, redirects, GEO | `.claude/docs/spec/content-seo-geo.md` |
| Tria, синхронізація, черги, ідемпотентність | `.claude/docs/spec/tria-jobs.md` |
| Замовлення, кошик, checkout, клієнти | `.claude/docs/spec/orders.md` |
| БД-таблиці, Prisma, Redis, кеш, CI/CD, env, тести, health | `.claude/docs/spec/infra.md` |
| Кольори, шрифти, tone of voice | `.claude/docs/brand.md` |
| Дерево категорій (seed), вітринні сторінки | `.claude/docs/categories.md` |
| Відкриті питання та рішення | `.claude/docs/decisions.md` |
| **Роадмап (поточний крок, чекбокси)** | `.claude/docs/roadmap.md` |

Посилання на ТЗ пиши як `§N` (номери розділів збережено). Оригінали — у `.claude/docs/source/` (не читати без потреби).

## Економія токенів — як працювати
- Не читай усе ТЗ; відкривай один файл з таблиці вище.
- Перед новим кодом шукай існуючий патерн (Grep) і повторюй його; не створюй паралельних утиліт.
- Великі файли читай частинами (offset/limit). Не перечитуй щойно відредаговані файли.
- Нове архітектурне рішення → коротко допиши в `.claude/docs/decisions.md`.

## Команди
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · пакет у workspace: `npm i <pkg> -w apps/api` · `npm run format` · `docker compose up -d` (з етапу 3). Пакети: `@ml/*`; web :3000, api :4000
