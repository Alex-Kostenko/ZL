# PostgreSQL, Prisma, Redis, cache, Cloudflare, observability, env, Docker, CI/CD, міграції, бекапи, тести, playground

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

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

## 47. Cloudflare

Перед application використовувати Cloudflare для:

-   DNS;
-   CDN;
-   WAF;
-   DDoS protection;
-   rate limiting;
-   bot protection.

Admin можна додатково захистити окремими WAF/access rules.

## 48. Observability

Збирати:

-   structured application logs;
-   errors;
-   performance metrics;
-   background job failures;
-   Tria sync errors.

Кожен request повинен мати `requestId`.

Кожен background job повинен мати `jobId`.

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

Next.js та NestJS можна запускати через npm для швидкого HMR.

## 53. CI/CD

CI/CD реалізувати через **GitHub Actions + AWS**.

### Pull Request pipeline

``` text
GitHub Pull Request
 ↓
npm ci
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

## 55. Backups

PostgreSQL:

-   automatic backups;
-   бажано point-in-time recovery;
-   регулярна перевірка restore procedure.

Наявність backup без перевірки відновлення не вважається достатньою.

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
