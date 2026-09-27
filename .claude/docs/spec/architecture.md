# Архітектура, monorepo, backend, API

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 1. Загальна архітектура

Система складається з таких компонентів:

``` text
Cloudflare
    │
    ▼
Next.js
├── Storefront
└── Admin Panel / CMS
    │
    ▼ REST API
NestJS Backend
├── Auth / RBAC
├── Catalog
├── Pricing
├── Inventory
├── Orders
├── Checkout
├── CMS
├── SEO
└── Integrations
    │
    ├── PostgreSQL
    ├── Redis
    ├── Meilisearch
    ├── S3-compatible Storage
    └── BullMQ Workers
            │
            ▼
           Tria
```

### Основний принцип

-   **Next.js** --- presentation layer.
-   **NestJS** --- business logic та API.
-   **PostgreSQL** --- primary application database.
-   **Redis** --- cache, sessions, locks, queues.
-   **Meilisearch** --- пошук та faceted filtering.
-   **S3-compatible storage** --- зображення та файли.
-   **Tria** --- ERP / система обліку товарів.
-   **BullMQ** --- background jobs та синхронізація.

Frontend не повинен напряму працювати з PostgreSQL або Tria.

## 2. Monorepo

Весь продукт зберігається в одному Git repository.

### Рекомендований стек

-   TypeScript
-   npm (workspaces) — рішення замовника замість pnpm
-   Turborepo
-   ESLint
-   Prettier

### Структура

``` text
myslyvska-lavka/
├── apps/
│   ├── web/                 # Next.js: storefront + admin
│   ├── api/                 # NestJS
│   └── worker/              # optional: окремі workers при масштабуванні
│
├── packages/
│   ├── ui/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── config/
│   ├── eslint-config/
│   └── tsconfig/
│
├── infrastructure/
│   ├── docker/
│   ├── migrations/
│   └── scripts/
│
├── docker-compose.yml
├── turbo.json
└── package.json
```

`npm run dev` повинен запускати локальне dev-середовище.

## 17. Backend

Backend реалізувати на **NestJS + TypeScript**.

`apps/api` є єдиним джерелом business logic.

``` text
Next.js
   ↓
NestJS
   ↓
PostgreSQL / Redis / Search / Tria
```

## 18. Backend Modules

``` text
AuthModule
UsersModule
RolesModule

ProductsModule
CategoriesModule
BrandsModule
AttributesModule

PricingModule
InventoryModule
SearchModule

CartModule
CheckoutModule

OrdersModule
CustomersModule

PromotionsModule

ContentModule
MediaModule
SeoModule

IntegrationsModule
└── TriaModule

JobsModule
AuditModule
```

## 19. API

Початково використовувати REST API.

API versioning:

``` text
/api/v1/
```

Приклади:

``` text
GET    /api/v1/products
GET    /api/v1/products/:id

POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id

GET    /api/v1/categories
GET    /api/v1/search

POST   /api/v1/cart
POST   /api/v1/checkout

GET    /api/v1/orders/:id
```

## 20. API Contract

Frontend не повинен вручну дублювати backend types.

Рекомендований flow:

``` text
NestJS
 ↓
OpenAPI
 ↓
Generated TypeScript Client
 ↓
Next.js
```

## 21. Validation

Усі external inputs повинні проходити backend validation.

Frontend validation не є security validation.

Можна використовувати DTO та/або shared Zod schemas там, де це доцільно.

## 62. Фінальний технологічний стек

  Layer            Technology
  ---------------- --------------------------------------------
  Language         TypeScript
  Monorepo         npm workspaces + Turborepo
  Storefront       Next.js + React
  Admin / CMS      Next.js + React
  Styling          Tailwind CSS
  Backend          NestJS
  Database         PostgreSQL
  ORM              Prisma або Drizzle --- вибрати один
  Cache            Redis
  Queue            BullMQ
  Search           Meilisearch
  Media            S3-compatible storage
  Admin Auth       Password + Argon2id + TOTP
  Authorization    RBAC
  ERP              Tria
  API              REST + OpenAPI
  Infrastructure   Docker + Cloudflare
  CI/CD            GitHub Actions або аналог
  Observability    Structured logs + metrics + error tracking

## 63. Масштабування

Архітектура повинна дозволяти незалежно масштабувати:

``` text
WEB
API
WORKERS
DATABASE
REDIS
SEARCH
```

без переписування business logic.

Це необхідно для:

-   50 000+ товарів;
-   великої кількості фільтрів;
-   імпорту товарів;
-   синхронізації Tria;
-   масових оновлень цін;
-   масових оновлень залишків;
-   росту кількості замовлень та користувачів.

## 64. Цільова структура системи

``` text
                   Cloudflare
                       │
                 ┌─────▼─────┐
                 │  Next.js  │
                 │           │
                 │ Storefront│
                 │ Admin/CMS │
                 └─────┬─────┘
                       │
                    REST API
                       │
                 ┌─────▼─────┐
                 │  NestJS   │
                 └─────┬─────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
  PostgreSQL         Redis          Meilisearch
                       │
                       ▼
                    BullMQ
                       │
                       ▼
                    Workers
                       │
                ┌──────┴──────┐
                ▼             ▼
              TRIA            S3
```

## 65. Ключові архітектурні правила

1.  **Next.js не працює напряму з PostgreSQL або Tria.**
2.  **NestJS є єдиним application/business layer.**
3.  **Tria integration ізольована через adapter.**
4.  **Tria та Website мають чітко визначені Source of Truth.**
5.  **Великі операції виконуються через background jobs.**
6.  **Search не виконується через важкі SQL-запити, якщо задача належить
    search engine.**
7.  **Redis не використовується як primary database.**
8.  **Media не зберігаються у PostgreSQL як binary data.**
9.  **Admin authorization перевіряється backend, а не тільки UI.**
10. **Critical integrations повинні бути idempotent.**
11. **Storefront не повинен ставати недоступним через недоступність
    Tria.**
12. **Архітектура повинна дозволяти незалежне масштабування Web, API та
    Workers.**
