# Технічні вимоги --- «Мисливська лавка»

**Версія:** 1.0\
**Архітектура:** Headless e-commerce, monorepo\
**Основний каталог:** 50 000+ товарів\
**Інтеграція:** Tria\
**Основна мова:** українська; архітектура повинна підтримувати додавання
інших мов.

------------------------------------------------------------------------

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

------------------------------------------------------------------------

## 2. Monorepo

Весь продукт зберігається в одному Git repository.

### Рекомендований стек

-   TypeScript
-   pnpm
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
├── pnpm-workspace.yaml
└── package.json
```

`pnpm dev` повинен запускати локальне dev-середовище.

------------------------------------------------------------------------

## 3. Web Application

### Technology

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   **shadcn/ui** --- основна бібліотека UI-компонентів
-   **Radix UI** --- accessible UI primitives для складних інтерактивних
    компонентів
-   **Lucide React** --- базова бібліотека іконок
-   **TanStack Table** --- таблиці Admin Panel із server-side
    pagination, sorting та filtering

### Frontend UI Architecture

Спільні UI primitives та reusable components зберігати у:

``` text
packages/ui/
├── button/
├── input/
├── textarea/
├── select/
├── checkbox/
├── radio-group/
├── switch/
├── dialog/
├── drawer/
├── dropdown-menu/
├── popover/
├── tooltip/
├── tabs/
├── accordion/
├── command/
├── table/
├── pagination/
├── form/
└── data-table/
```

Основні правила:

1.  **shadcn/ui** використовувати як основний component layer.
2.  **Radix UI** використовувати для accessible primitives та складної
    інтерактивної поведінки.
3.  Стилізацію виконувати через **Tailwind CSS**.
4.  Не додавати паралельно MUI, Ant Design або інший повноцінний UI
    framework без окремого технічного обґрунтування.
5.  Design tokens повинні відповідати бренд-системі «Мисливської лавки».
6.  Компоненти повинні підтримувати accessibility, focus states та
    keyboard navigation.
7.  Storefront та Admin Panel використовують спільні primitives, але
    можуть мати окремі domain/composition components.
8.  Для великих таблиць Admin Panel використовувати **TanStack Table**
    із server-side pagination, filtering та sorting. Не завантажувати
    весь каталог у browser.
9.  Загальні UI-компоненти не повинні містити business logic конкретного
    домену.
10. Компоненти shadcn/ui після додавання є частиною codebase та можуть
    адаптуватися під design system проєкту.

`apps/web` містить:

-   публічний Storefront;
-   закриту Admin Panel;
-   CMS interface.

Storefront та Admin повинні мати незалежні layouts та UI.

## 4. Storefront

Основні маршрути:

``` text
/
/catalog

/category/[...slug]
  ├── Level 1
  ├── Level 2
  └── Level 3

/product/[slug]
/brand/[slug]
/brands
/search

/sale
/antidron

/blog
/blog/[slug]

/about
/contacts
/delivery
/payment
/warranty

/cart
/checkout

/account
/account/orders
/account/profile

/login
/register
```

Storefront повинен використовувати SSR/SSG/ISR там, де це доцільно для
SEO та performance.

------------------------------------------------------------------------

## 5. Каталог

Каталог повинен підтримувати щонайменше **50 000 товарів** без зміни
архітектури.

Категорії повинні підтримувати необмежену вкладеність на рівні моделі
даних.

### Category

``` text
id
parentId
name
slug
description
image
icon
position
isActive
seoTitle
seoDescription
canonical
createdAt
updatedAt
```

------------------------------------------------------------------------

## 6. Product

Product є центральною сутністю каталогу.

``` text
id
externalId
sku
slug
title
shortDescription
description
brandId
status
isPublished
isSale
isAntidron
createdAt
updatedAt
publishedAt
```

### Спеціальні ознаки

`isSale` та `isAntidron` --- **ознаки товару, а не категорії**.

Вони формують окремі вітринні сторінки:

``` text
/sale
/antidron
```

Ці сторінки не мають власної category hierarchy.

------------------------------------------------------------------------

## 7. Product Variants

Архітектура повинна підтримувати:

``` text
Product
├── Variant
├── Variant
└── Variant
```

### Variant

``` text
id
productId
sku
externalId
barcode
weight
dimensions
status
```

Ціни та залишки бажано тримати в окремих доменних моделях, а не
дублювати як єдине джерело істини у Variant.

------------------------------------------------------------------------

## 8. Attributes

Характеристики не повинні зберігатися одним неструктурованим JSON-полем
Product.

### Attribute

``` text
id
name
code
type
unit
filterable
searchable
```

Типи:

``` text
string
number
boolean
select
multi-select
range
```

Категорії повинні визначати доступні attributes.

------------------------------------------------------------------------

## 9. Brands

``` text
id
name
slug
logo
description
country
website
isActive
seoTitle
seoDescription
```

Для бренду повинна існувати SEO-сторінка:

``` text
/brand/[slug]
```

------------------------------------------------------------------------

## 10. Pricing

Pricing є окремим доменом.

Необхідно підтримувати:

``` text
price
oldPrice
salePrice
currency
validFrom
validTo
```

Архітектура повинна дозволяти додати:

-   retail price;
-   wholesale price;
-   dealer price;
-   VIP price.

------------------------------------------------------------------------

## 11. Inventory

### Warehouse

``` text
id
externalId
name
```

### Inventory

``` text
productVariantId
warehouseId
quantity
reserved
available
updatedAt
```

Логіка:

``` text
available = quantity - reserved
```

Не використовувати одне глобальне `product.stock` як єдину модель
складського обліку.

------------------------------------------------------------------------

## 12. Search

Використовувати окремий search engine.

Початковий вибір: **Meilisearch**.

Індексувати:

-   title;
-   SKU;
-   brand;
-   category;
-   description;
-   attributes;
-   price;
-   availability.

Підтримувати:

-   typo tolerance;
-   autocomplete;
-   facets;
-   filters;
-   sorting;
-   price ranges;
-   category filters;
-   brand filters;
-   attribute filters.

------------------------------------------------------------------------

## 13. Admin Panel

Admin Panel знаходиться за адресою:

``` text
/admin
```

Вона є частиною Next.js application.

### Структура

``` text
Dashboard

Catalog
├── Products
├── Categories
├── Brands
├── Attributes
├── Collections
└── Inventory

Orders
├── Orders
├── Returns
└── Customers

Marketing
├── Promotions
├── Sale
├── Antidron
└── Banners

Content
├── Pages
├── Blog
├── Menus
└── Media

SEO
├── Metadata
├── Redirects
└── Sitemap

Integrations
└── Tria

System
├── Users
├── Roles
├── Audit Log
└── Settings
```

------------------------------------------------------------------------

## 14. Product Admin

Product list повинен бути оптимізований для великого каталогу.

Обов'язково:

-   server-side search;
-   filtering;
-   sorting;
-   pagination;
-   bulk selection;
-   bulk actions.

### Bulk actions

-   Publish / Unpublish
-   Change category
-   Change brand
-   Sale ON/OFF
-   Antidron ON/OFF
-   Change status
-   Export
-   Delete

Потрібен CSV/XLSX import/export.

------------------------------------------------------------------------

## 15. CMS

CMS реалізовується всередині власної Admin Panel.

Не використовувати Strapi або WordPress.

CMS управляє:

-   Pages
-   Blog
-   Banners
-   Menus
-   Footer
-   Homepage sections
-   Landing pages
-   SEO
-   Media

Контент не повинен вимагати нового deploy для публікації.

------------------------------------------------------------------------

## 16. Media

Файли не зберігати у PostgreSQL.

Використовувати S3-compatible object storage.

### Media

``` text
id
filename
url
mimeType
width
height
size
alt
title
createdAt
```

Підтримувати:

-   AVIF
-   WebP
-   JPEG
-   PNG
-   SVG

Для Product:

``` text
ProductMedia
├── productId
├── mediaId
├── position
└── isPrimary
```

------------------------------------------------------------------------

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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

## 21. Validation

Усі external inputs повинні проходити backend validation.

Frontend validation не є security validation.

Можна використовувати DTO та/або shared Zod schemas там, де це доцільно.

------------------------------------------------------------------------

## 22. Admin Authentication

Admin authentication:

``` text
email
+
password
+
TOTP
```

Паролі хешувати через **Argon2id**.

TOTP повинен бути сумісний із:

-   Google Authenticator;
-   Microsoft Authenticator;
-   1Password;
-   іншими стандартними TOTP applications.

TOTP secret повинен зберігатися зашифрованим, а не plaintext.

------------------------------------------------------------------------

## 23. Admin Sessions

Session/token architecture повинна використовувати secure cookies:

``` text
HttpOnly
Secure
SameSite
```

Не зберігати admin access token у `localStorage`.

Передбачити:

-   session expiration;
-   revoke session;
-   logout all devices;
-   recovery codes.

------------------------------------------------------------------------

## 24. RBAC

Початкові ролі:

``` text
SUPER_ADMIN
ADMIN
CATALOG_MANAGER
CONTENT_MANAGER
ORDER_MANAGER
```

Приклади permissions:

``` text
product.read
product.create
product.update
product.delete

order.read
order.update

content.read
content.update

inventory.read

user.manage
role.manage
settings.manage
```

NestJS перевіряє permissions незалежно від frontend.

------------------------------------------------------------------------

## 25. Audit Log

Усі критичні admin operations повинні логуватися.

``` text
id
adminUserId
action
entity
entityId
before
after
ip
userAgent
createdAt
```

Приклад:

``` text
PRODUCT_PRICE_CHANGED
DNT Zulus HD
31 900 → 32 500 UAH
```

------------------------------------------------------------------------

## 26. Tria Integration

Створити ізольований integration module.

``` text
integrations/
└── tria/
    ├── tria.module.ts
    ├── tria.service.ts
    ├── tria.adapter.ts
    ├── tria.mapper.ts
    └── sync/
        ├── products.sync.ts
        ├── prices.sync.ts
        ├── inventory.sync.ts
        └── orders.sync.ts
```

Основний application layer не повинен залежати від конкретного протоколу
Tria.

### Adapter contract

``` ts
interface TriaAdapter {
  getProducts(): Promise<ExternalProduct[]>;
  getPrices(): Promise<ExternalPrice[]>;
  getInventory(): Promise<ExternalInventory[]>;
  createOrder(order: Order): Promise<ExternalOrder>;
}
```

Реалізація може використовувати:

-   API;
-   database integration;
-   file exchange;
-   local bridge.

Зміна способу підключення Tria не повинна вимагати переписування
доменної логіки магазину.

------------------------------------------------------------------------

## 27. Source of Truth

### Tria

Tria є джерелом істини для:

-   SKU / external product ID;
-   accounting nomenclature;
-   accounting prices;
-   warehouse stock;
-   warehouses.

### Website

Website є джерелом істини для:

-   web title;
-   slug;
-   description;
-   photos;
-   web categories;
-   attributes;
-   SEO;
-   `isSale`;
-   `isAntidron`;
-   web content.

Конкретні правила синхронізації цін повинні бути зафіксовані після
перевірки поточної конфігурації Tria.

------------------------------------------------------------------------

## 28. Tria Synchronization

Основний flow:

``` text
TRIA
 ↓
Tria Adapter
 ↓
Mapper
 ↓
Validation
 ↓
Queue
 ↓
PostgreSQL
 ↓
Meilisearch
 ↓
Cache invalidation
```

Великі синхронізації не виконувати всередині HTTP request.

------------------------------------------------------------------------

## 29. Background Jobs

Використовувати **Redis + BullMQ**.

Queues:

``` text
tria-products
tria-inventory
tria-prices
tria-orders

search-index

images

emails

orders
```

Job повинен підтримувати:

-   retry;
-   exponential/fixed backoff;
-   timeout;
-   logging;
-   failure handling;
-   dead-letter/review flow для критичних помилок.

------------------------------------------------------------------------

## 30. Idempotency

Обов'язкова для:

-   Tria synchronization;
-   checkout;
-   payment operations;
-   order creation;
-   external integrations.

Повторне виконання одного job/request не повинно створювати дублікати.

Одне замовлення не повинно двічі потрапити в Tria.

------------------------------------------------------------------------

## 31. Tria Sync Status

Admin route:

``` text
/admin/integrations/tria
```

Повинен показувати:

``` text
Connection: OK

Last product sync:
25.09.2026 14:31

Products: 51 283
Updated: 127
Failed: 3

Last inventory sync:
25.09.2026 14:35

[Sync now]
```

Також потрібні:

-   sync history;
-   errors;
-   retry;
-   last successful synchronization;
-   job details.

------------------------------------------------------------------------

## 32. PostgreSQL

Основна relational database: **PostgreSQL**.

Ключові таблиці:

``` text
admin_users
roles
permissions
role_permissions

customers

products
product_variants

categories
product_categories

brands

attributes
attribute_values
product_attribute_values

warehouses
inventory

prices

orders
order_items
order_status_history

pages
articles
banners
menus

media

redirects
seo_metadata

integration_mappings
sync_logs

audit_logs
```

------------------------------------------------------------------------

## 33. ORM

Використовувати **Prisma** як єдиний ORM для PostgreSQL.

Вимоги:

-   Prisma Schema є основним ORM schema definition;
-   усі зміни database schema виконувати через Prisma Migrate;
-   не змішувати Prisma з іншим ORM;
-   Prisma Client використовується у NestJS data-access layer;
-   production migrations повинні запускатися контрольовано через CI/CD;
-   destructive migrations потребують окремої migration strategy.

## 34. Redis

Redis використовується для:

-   cache;
-   sessions;
-   rate limiting;
-   distributed locks;
-   BullMQ.

Redis не є primary database.

------------------------------------------------------------------------

## 35. Cache

Доцільно кешувати:

-   categories;
-   brands;
-   navigation;
-   filter metadata;
-   popular products;
-   configuration.

Обережно кешувати або не кешувати довго:

-   inventory;
-   cart;
-   checkout data.

Для кожного кешованого ресурсу повинна існувати cache invalidation
strategy.

------------------------------------------------------------------------

## 36. Orders

### Order

``` text
id
number
customerId
status
paymentStatus
deliveryStatus
subtotal
discount
delivery
total
currency
createdAt
updatedAt
```

### OrderItem

OrderItem повинен зберігати snapshot:

``` text
sku
title
price
quantity
total
```

Історичне замовлення не повинно змінюватися після редагування Product.

------------------------------------------------------------------------

## 37. Order State Machine

Наприклад:

``` text
NEW
 ↓
CONFIRMED
 ↓
PROCESSING
 ↓
SHIPPED
 ↓
COMPLETED
```

Додаткові:

``` text
CANCELLED
RETURNED
```

Статуси повинні бути формалізовані, а переходи --- контрольовані backend
logic.

------------------------------------------------------------------------

## 38. Cart

Підтримувати:

-   Guest Cart;
-   Authenticated Cart.

Після login передбачити merge guest cart та user cart.

Перед створенням Order backend повторно перевіряє:

-   availability;
-   actual price;
-   discounts;
-   quantity limits.

------------------------------------------------------------------------

## 39. Checkout

Checkout не довіряє значенням, отриманим із frontend.

Backend повторно розраховує:

-   price;
-   discount;
-   availability;
-   delivery;
-   total.

Frontend total використовується лише для UI.

------------------------------------------------------------------------

## 40. Customers

Customer та AdminUser --- різні security domains.

Customer:

``` text
id
email
phone
firstName
lastName
createdAt
updatedAt
```

------------------------------------------------------------------------

## 41. SEO

Підтримати:

-   title;
-   meta description;
-   canonical;
-   robots;
-   OpenGraph;
-   JSON-LD;
-   breadcrumbs;
-   sitemap;
-   robots.txt.

Для Product підтримати structured data, включаючи Product, Offer та
BreadcrumbList, де це коректно.

------------------------------------------------------------------------

## 42. Sitemap

Для 50 000+ товарів використовувати sitemap index.

``` text
/sitemap.xml

/sitemaps/products-1.xml
/sitemaps/products-2.xml
/sitemaps/categories.xml
/sitemaps/brands.xml
/sitemaps/pages.xml
```

------------------------------------------------------------------------

## 43. Redirects

Admin повинен дозволяти створювати:

-   301;
-   302. 

При зміні slug система повинна пропонувати redirect:

``` text
old URL → new URL
```

------------------------------------------------------------------------

## 44. Performance

Цільові Core Web Vitals:

``` text
LCP < 2.5 s
INP < 200 ms
CLS < 0.1
```

Storefront та Admin повинні мати окремі bundles/layout boundaries там,
де це можливо.

------------------------------------------------------------------------

## 45. Images

Pipeline:

``` text
original
 ↓
resize
 ↓
AVIF/WebP
 ↓
CDN
```

Не віддавати оригінальні великі зображення у product cards.

------------------------------------------------------------------------

## 46. Security

Обов'язково:

-   HTTPS;
-   CSP;
-   CORS policy;
-   CSRF protection where applicable;
-   rate limiting;
-   backend input validation;
-   SQL injection protection;
-   XSS mitigation;
-   secure cookies;
-   Argon2id password hashing;
-   TOTP;
-   RBAC.

Admin endpoints повинні мати суворіші security/rate-limit policies.

------------------------------------------------------------------------

## 47. Cloudflare

Перед application використовувати Cloudflare для:

-   DNS;
-   CDN;
-   WAF;
-   DDoS protection;
-   rate limiting;
-   bot protection.

Admin можна додатково захистити окремими WAF/access rules.

------------------------------------------------------------------------

## 48. Observability

Збирати:

-   structured application logs;
-   errors;
-   performance metrics;
-   background job failures;
-   Tria sync errors.

Кожен request повинен мати `requestId`.

Кожен background job повинен мати `jobId`.

------------------------------------------------------------------------

## 49. Error Tracking

Production errors повинні автоматично потрапляти в error tracking
system.

Контекст:

``` text
requestId
user/admin ID
endpoint
environment
release
```

Не логувати:

-   passwords;
-   tokens;
-   TOTP secrets/codes;
-   payment secrets.

------------------------------------------------------------------------

## 50. Health Checks

Backend:

``` text
/health
/health/ready
```

Перевіряти:

-   API;
-   PostgreSQL;
-   Redis;
-   Meilisearch.

Tria health показувати окремо. Тимчасова недоступність Tria не повинна
робити storefront недоступним.

------------------------------------------------------------------------

## 51. Environments

Система має тільки два environment:

``` text
development
production
```

### Development

Використовується для:

-   локальної розробки;
-   automated tests;
-   integration testing;
-   Playground;
-   Swagger/OpenAPI;
-   тестування Tria integration;
-   debugging.

### Production

Використовується для реального магазину та production data.

Development та Production повинні використовувати окремі:

-   PostgreSQL databases;
-   Redis instances/databases;
-   Meilisearch indexes;
-   S3 buckets/prefixes;
-   secrets;
-   Tria configuration.

Окремий `staging` environment не передбачається.

Production data та production secrets не повинні використовуватися у
development без окремої контрольованої процедури.

## 52. Docker

Локально `docker compose up` повинен піднімати infrastructure
dependencies:

-   PostgreSQL;
-   Redis;
-   Meilisearch.

Next.js та NestJS можна запускати через pnpm для швидкого HMR.

------------------------------------------------------------------------

## 53. CI/CD

CI/CD реалізувати через **GitHub Actions + AWS**.

### Pull Request pipeline

``` text
GitHub Pull Request
 ↓
pnpm install
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
 ↓
Prisma migration validation
```

Merge у `main` запускає production deployment.

### Production deployment

``` text
GitHub
   ↓
GitHub Actions
   ↓
Tests + Build
   ↓
Docker Images
   ↓
AWS ECR
   ↓
Prisma Production Migrations
   ↓
Application Deployment
   ↓
Health Checks
```

### AWS services

Базово передбачити:

-   **AWS ECR** --- Docker container registry;
-   **AWS S3** --- product images, CMS media, uploads та інші
    object-storage assets;
-   **AWS CloudFront** --- CDN для S3/media та інших відповідних static
    assets;
-   **AWS IAM** --- permissions для CI/CD та application services.

Конкретний compute/runtime сервіс для Next.js, NestJS та Workers може
бути визначений окремо в deployment architecture.

### GitHub → AWS authentication

Не використовувати довгоживучі AWS Access Key / Secret Key у GitHub
Secrets, якщо цього можна уникнути.

Використовувати:

``` text
GitHub Actions
      ↓
GitHub OIDC
      ↓
AWS IAM Role
      ↓
Temporary AWS Credentials
```

IAM role повинна використовувати least-privilege permissions.

Окремо контролювати permissions для:

-   ECR push;
-   application deployment;
-   S3 access;
-   CloudFront invalidation, якщо необхідно;
-   migration/deployment operations.

### Deployment requirements

-   production deployment запускається тільки з дозволеної
    branch/workflow;
-   deployment failure не повинен залишати систему у частково оновленому
    стані;
-   після deployment виконувати health checks;
-   database migrations повинні бути сумісними зі strategy deployment;
-   secrets не повинні потрапляти у repository, build logs або Docker
    images.

## 54. Database Migrations

Migrations повинні враховувати zero/minimal-downtime deployment.

Destructive schema changes не виконувати без окремої migration strategy.

------------------------------------------------------------------------

## 55. Backups

PostgreSQL:

-   automatic backups;
-   бажано point-in-time recovery;
-   регулярна перевірка restore procedure.

Наявність backup без перевірки відновлення не вважається достатньою.

------------------------------------------------------------------------

## 56. Testing

### Unit

Тестувати:

-   services;
-   mappers;
-   price calculations;
-   permissions;
-   Tria mappings.

### Integration

Тестувати:

-   API + PostgreSQL;
-   API + Redis;
-   queues;
-   search integration.

### E2E

Критичні сценарії:

-   search product;
-   open product;
-   add to cart;
-   checkout;
-   create order;
-   admin login + TOTP;
-   edit product;
-   publish content;
-   Tria synchronization.

------------------------------------------------------------------------

## 57. API Documentation та Development Playground

NestJS повинен генерувати **OpenAPI / Swagger** documentation.

Development route:

``` text
/api/docs
```

### Playground

Додатково реалізувати development-only Playground:

``` text
/playground
```

Playground призначений для ручного тестування та debugging:

-   NestJS API requests/responses;
-   authentication;
-   RBAC;
-   Product/Category API;
-   Meilisearch search;
-   filters;
-   Tria mapping та synchronization;
-   background jobs;
-   email templates;
-   shadcn/ui / Radix UI components;
-   checkout/order flows;
-   JSON payloads;
-   API validation та error responses.

Playground може містити тестові форми, request builders, fixtures та
debug information.

### Security requirement

`/playground` повинен бути **повністю disabled у production**, а не лише
прихований у UI/navigation.

Swagger/OpenAPI у production повинен бути disabled або захищений
authentication/access policy.

## 58. Import / Export

Admin повинен підтримувати:

-   CSV;
-   XLSX.

Для великих import:

``` text
upload
 ↓
background job
 ↓
validation
 ↓
preview/report
 ↓
import
 ↓
result report
```

Не обробляти десятки тисяч рядків одним довгим HTTP request.

------------------------------------------------------------------------

## 59. Localization

Система повинна підтримувати:

``` text
uk — українська, основна мова
ru — російська
en — англійська
```

Українська є default locale.

Data model не повинен використовувати підхід:

``` text
titleUk
titleRu
titleEn
```

Використовувати масштабовану translation model.

Приклад:

``` text
products
└── product_translations
    ├── productId
    ├── locale
    ├── title
    ├── shortDescription
    └── description
```

Аналогічний pattern використовувати для:

-   categories;
-   brands, якщо контент бренду локалізується;
-   attributes та attribute values;
-   CMS pages;
-   blog;
-   banners;
-   menus;
-   landing pages;
-   SEO metadata.

Архітектура повинна дозволяти додавання нових locale без зміни основної
database schema.

## 60. Configuration

Через Admin повинні керуватися системні налаштування:

-   Store name;
-   Contacts;
-   Currency;
-   VAT;
-   Delivery;
-   Payment;
-   Social networks;
-   SEO defaults;
-   integration settings, якщо вони не є секретами.

Не hardcode business configuration у frontend.

------------------------------------------------------------------------

## 61. Secrets

Secrets зберігати через environment variables / secrets manager.

Наприклад:

``` text
DATABASE_URL
REDIS_URL
S3 credentials
TRIA credentials
TOTP encryption key
email credentials
payment credentials
```

Не commit `.env` із production secrets у Git.

------------------------------------------------------------------------

## 62. Фінальний технологічний стек

  Layer            Technology
  ---------------- --------------------------------------------
  Language         TypeScript
  Monorepo         pnpm + Turborepo
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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

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

------------------------------------------------------------------------

## 67. GEO --- Generative Engine Optimization

Сайт повинен бути оптимізований не тільки для класичних пошукових
систем, але й для коректного розуміння, індексації, використання та
цитування контенту AI/LLM-системами та AI search engines, зокрема
ChatGPT, Gemini, Perplexity та іншими generative engines.

GEO доповнює SEO, але не замінює його.

### 67.1. Основні цілі GEO

-   зробити товари, категорії, бренди та експертний контент
    машинозрозумілими;
-   забезпечити однозначне визначення сутностей;
-   підвищити ймовірність коректного використання та цитування контенту
    generative engines;
-   забезпечити доступність актуальних характеристик, цін, наявності та
    canonical URLs;
-   мінімізувати дублікати, суперечливі дані та неоднозначні описи;
-   створити структуровану базу експертного контенту про товари,
    полювання, риболовлю та активний відпочинок.

### 67.2. Crawlability та indexability

Публічний контент, який повинен бути доступний пошуковим та AI-системам,
має бути доступний у server-rendered HTML без необхідності виконувати
client-side JavaScript для отримання основного змісту.

Необхідно коректно підтримувати:

``` text
robots.txt
sitemap.xml
canonical
HTTP status codes
301 redirects
404 responses
```

Правила доступу конкретних crawler/user-agent повинні керуватися
централізовано та свідомо, а не випадково через WAF/CDN.

### 67.3. Structured Data

Використовувати Schema.org JSON-LD там, де тип даних відповідає
фактичному контенту сторінки.

Передбачити:

``` text
Organization
WebSite
BreadcrumbList
Product
Offer
Brand
Article
FAQPage — тільки коли сторінка реально містить відповідний FAQ-контент
```

Product structured data повинна формуватися з актуальних application
data.

Приклад логічної структури:

``` text
Product
├── name
├── description
├── image
├── sku
├── brand
├── category
└── offers
    ├── price
    ├── priceCurrency
    ├── availability
    └── url
```

Не генерувати structured data, яка суперечить видимому користувачу
контенту.

### 67.4. Entity-first Content Model

Контент повинен будуватися навколо чітких сутностей та зв'язків:

``` text
Product
├── Brand
├── Category
├── Attributes
├── Variant
├── Compatibility
├── Related Products
└── Related Content
```

Для кожної сутності використовувати стабільні внутрішні ID, canonical
URL та однозначні назви.

### 67.5. Product Content

Product page повинна містити достатній текстовий контекст, а не лише
назву, фотографію та ціну.

Передбачити:

-   повну назву;
-   бренд;
-   SKU / артикул;
-   категорію;
-   короткий опис;
-   детальний опис;
-   структуровані характеристики;
-   комплектацію, якщо застосовується;
-   сумісність, якщо застосовується;
-   актуальну ціну;
-   статус наявності;
-   FAQ або відповіді на типові питання, коли вони реально корисні;
-   related guides/articles;
-   canonical URL;
-   дату актуалізації даних там, де це доречно.

Ключові факти не повинні бути доступні тільки всередині зображень.

### 67.6. Category Content

Category page повинна мати:

-   H1;
-   короткий description;
-   breadcrumbs;
-   дочірні категорії;
-   доступні filters;
-   product listing;
-   SEO/GEO description;
-   FAQ/guide content, якщо він реально додає користь;
-   internal links на пов'язані категорії та матеріали.

Не генерувати тисячі низькоякісних текстів лише для покриття ключових
слів.

### 67.7. Brand Pages

Для брендів створювати окремі entity pages:

``` text
/brand/[slug]
```

Brand page може містити:

-   назву;
-   logo;
-   опис;
-   країну;
-   офіційний website, якщо відомий;
-   доступні категорії;
-   товари бренду;
-   related articles;
-   structured data;
-   canonical URL.

### 67.8. Expert Content

CMS повинна дозволяти створювати експертний контент:

``` text
Guides
Comparisons
How-to articles
FAQ
Buying guides
Brand guides
Category guides
Glossary
```

Матеріали повинні мати чітку структуру:

``` text
Title
Summary
Author
Published date
Updated date
Main content
Sources/References, якщо використовуються
Related products
Related categories
Related articles
```

Для матеріалів, де важлива авторська експертиза, передбачити author
entity/profile.

### 67.9. Answer-first Content

Для інформаційних сторінок бажано мати коротку фактичну відповідь або
summary на початку, після чого --- детальне пояснення.

Контент повинен використовувати:

-   логічні headings;
-   короткі абзаци;
-   списки;
-   таблиці для структурованих порівнянь;
-   чіткі одиниці вимірювання;
-   однозначні назви характеристик.

Це не повинно погіршувати читабельність для людини.

### 67.10. Facts та Provenance

Для характеристик товарів бажано зберігати provenance/source metadata,
особливо якщо дані імпортуються з Tria, supplier feeds або вводяться
вручну.

Приклад:

``` text
source
sourceExternalId
sourceUpdatedAt
verifiedAt
```

Система повинна уникати ситуації, коли на різних сторінках публікуються
різні значення однієї характеристики.

### 67.11. Freshness

Для динамічних даних необхідно підтримувати актуальність:

-   price;
-   availability;
-   product status;
-   product specifications;
-   discontinued products;
-   redirects.

Після синхронізації Tria повинні оновлюватися залежні representations:

``` text
PostgreSQL
 ↓
Search Index
 ↓
Cache
 ↓
Storefront
 ↓
Structured Data
```

### 67.12. Internal Linking

Автоматично та/або через CMS підтримувати semantic internal linking:

``` text
Article → Product
Article → Category
Product → Brand
Product → Category
Product → Guide
Category → Guide
Brand → Products
```

Не створювати штучні link farms.

### 67.13. Canonical Entity URLs

Кожна публічна сутність повинна мати один canonical URL.

Наприклад:

``` text
/product/[slug]
/category/[...slug]
/brand/[slug]
/blog/[slug]
```

Filters, sorting, tracking parameters та інші URL variants не повинні
створювати неконтрольовані дублікати canonical content.

### 67.14. Machine-readable Feeds

Архітектура повинна дозволяти створення machine-readable feeds для
product/catalog data, якщо вони будуть потрібні зовнішнім платформам.

Feed generation повинна використовувати ті самі validated application
data, що й storefront.

### 67.15. llms.txt

Можна підтримати:

``` text
/llms.txt
```

як експериментальний machine-readable discovery/documentation layer.

`llms.txt` не вважати заміною:

-   robots.txt;
-   sitemap;
-   structured data;
-   canonical URLs;
-   якісного HTML-контенту.

Його використання повинно бути configurable, оскільки підтримка такого
механізму зовнішніми AI-системами може відрізнятися.

### 67.16. GEO Admin Tools

У Admin Panel додати GEO/SEO tooling.

Наприклад:

``` text
SEO & GEO
├── Metadata
├── Structured Data Preview
├── Entity Preview
├── Sitemap
├── Redirects
├── robots.txt
├── llms.txt
└── Content Quality
```

Для Product/Category/Brand/Article бажано показувати:

-   canonical URL;
-   indexability;
-   title;
-   description;
-   structured data status;
-   missing important fields;
-   localization completeness;
-   internal linking warnings.

### 67.17. GEO Playground

Development Playground повинен дозволяти тестувати:

-   rendered HTML;
-   metadata;
-   canonical URL;
-   JSON-LD;
-   entity representation;
-   localized content;
-   sitemap output;
-   robots rules;
-   llms.txt output;
-   product facts used для machine-readable representations.

Playground не повинен бути доступний у production.

### 67.18. Localization та GEO

GEO повинно працювати для всіх підтримуваних мов:

``` text
uk
ru
en
```

Кожна локалізована сторінка повинна мати коректні:

-   locale;
-   canonical/hreflang strategy;
-   localized metadata;
-   localized structured content;
-   consistent entity identity між мовами.

Переклад не повинен створювати окрему логічну Product entity --- це
локалізоване представлення тієї самої сутності.

### 67.19. GEO Performance Requirements

GEO не повинно створювати окремий важкий runtime pipeline для кожного
request.

JSON-LD, metadata та machine-readable representations повинні
формуватися з нормалізованих application data та кешуватися там, де це
безпечно.

### 67.20. GEO Monitoring

Передбачити можливість відстежувати:

-   AI/referral traffic;
-   landing pages;
-   crawler activity, якщо доступно з infrastructure logs;
-   найбільш цитовані/відвідувані content entities, якщо це можливо
    визначити з доступних analytics/referral data;
-   помилки structured data;
-   broken canonical URLs;
-   sitemap/indexing issues.

Не робити припущення, що конкретний AI provider гарантовано індексує або
цитує сторінку лише через наявність GEO markup.

## 68. Наступні технічні документи

Перед початком повної реалізації рекомендується окремо зафіксувати:

1.  Database ERD.
2.  Product/Category/Attribute data model.
3.  Tria integration contract.
4.  REST API specification.
5.  Authentication та RBAC specification.
6.  Admin Panel information architecture.
7.  Storefront routing та SEO architecture.
8.  Deployment architecture.
9.  MVP scope та backlog.
10. Конкретний набір бібліотек і їх версії.
