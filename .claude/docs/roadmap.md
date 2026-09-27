# Роадмап: від нуля до готового проєкту локально

> Мета: повністю робочий магазин на `localhost` — storefront, admin, API, пошук, черги, Tria (mock), замовлення.
> Production (AWS, Cloudflare, CI/CD deploy) — окремий етап після цього роадмапу.
> Позначки: 👤 робиш ти сам · 🤖 робить Claude · ✅ критерій готовності (не йти далі, поки не виконано).
> Розмір: S — 1 сесія, M — 2–4 сесії, L — 5+ сесій з Claude.

## Як працювати з Claude (економія токенів)
- **Один крок = одна сесія.** Починай так: «Роадмап, крок 5.2». Після кроку — `/clear`.
- Після кожного ✅ — git commit. Якщо щось зламалося, є куди відкотитись.
- Не проси «зроби весь магазин» — Claude робить краще маленькими перевірюваними кроками.
- Зроблене відмічай тут `[x]`, щоб наступна сесія знала, де ти.

---

## Етап 0. Підготовка комп'ютера 👤 (S)
- [x] 0.1 Додати Git у Windows PATH: `C:\Program Files\Git\cmd` (зараз Git бачить лише Bash).
- [x] 0.2 Увімкнути WSL2: PowerShell від адміністратора → `wsl --install` → перезавантаження.
- [x] 0.3 Встановити **Docker Desktop** (WSL2 backend). Виділити ≥ 6 GB RAM (у тебе 16 GB).
- [x] 0.4 npm — вже встановлений разом з Node (v11.19).
- [x] 0.5 Акаунт GitHub + `winget install GitHub.cli` → `gh auth login`.
- [x] 0.6 VS Code розширення: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense, Docker.
- ✅ `git -v`, `docker run hello-world`, `npm -v`, `node -v` працюють у новому терміналі.

## Етап 1. Відповіді на відкриті питання 👤 (паралельно з етапами 2–7)
Див. `decisions.md`. Блокують пізніші етапи:
- [ ] 1.1 Режим продажу зброї/патронів (онлайн / резерв / самовивіз) → потрібно до **етапу 12**.
- [ ] 1.2 Спосіб підключення Tria + доступ до тестової Tria → до **кроку 11.4**.
- [ ] 1.3 Платіжний провайдер і служби доставки → до **кроку 12.4** (до того — mock).
- [ ] 1.4 URL-стратегія мов (`/`, `/ru/`, `/en/`?) → до **етапу 8**.

## Етап 2. Каркас monorepo 🤖 (S)
- [x] 2.1 `git init`, `.gitignore`, `.editorconfig`, `.nvmrc`, README.
- [x] 2.2 npm workspaces (`"workspaces"` у root package.json) + Turborepo (`turbo.json`: dev, build, lint, typecheck, test).
- [x] 2.3 `packages/tsconfig`, `packages/eslint-config`, Prettier — спільні конфіги.
- [x] 2.4 `apps/api` (NestJS), `apps/web` (Next.js App Router + Tailwind) — порожні «hello world».
- [x] 2.5 Порожні пакети: `ui`, `types`, `validation`, `config`, `api-client`.
- [x] 2.6 Git hooks (husky + lint-staged): lint і format перед commit.
- [x] 2.7 GitHub repo + GitHub Actions: lint → typecheck → test → build на кожен PR.
- ✅ `npm run dev` запускає web (:3000) і api (:4000); `npm run lint && npm run typecheck` зелені; CI зелений.

## Етап 3. Локальна інфраструктура 🤖 (S)
- [x] 3.1 `docker-compose.yml`: PostgreSQL 16, Redis 7, Meilisearch, **MinIO** (локальний S3, `pgsty/minio`), **Mailpit** (перехоплення email).
- [x] 3.2 Volumes для даних, healthchecks, `.env.example` для всіх сервісів.
- [x] 3.3 `packages/config`: типізоване читання env з валідацією (падати при старті, якщо змінної немає).
- [x] 3.4 Скрипти: `npm run infra:up`, `infra:down`, `infra:reset`.
- ✅ `npm run infra:up` → усі контейнери healthy; Meilisearch UI :7700, MinIO :9001, Mailpit :8025 відкриваються.

## Етап 4. Фундамент backend 🤖 (M)
- [x] 4.1 Prisma підключено до NestJS (PrismaModule), перша міграція.
- [x] 4.2 Structured logging (pino) + `requestId` у кожному запиті та відповіді.
- [x] 4.3 Глобальна валідація, єдиний формат помилок, exception filter.
- [x] 4.4 `/health`, `/health/ready` (Postgres, Redis, Meilisearch).
- [x] 4.5 OpenAPI/Swagger на `/api/docs` (тільки dev), версіонування `/api/v1`.
- [x] 4.6 Redis module + BullMQ (JobsModule) з базовою чергою та `jobId` у логах; Bull Board UI (dev).
- [x] 4.7 Генерація `packages/api-client` з OpenAPI (`npm run api:generate`).
- [x] 4.8 Тестова інфраструктура: Vitest unit + integration з окремою тестовою БД.
- ✅ `/health/ready` = ok; Swagger відкривається; web отримує дані через згенерований клієнт; тести зелені. **Етап виконано.**

## Етап 5. Модель даних каталогу 🤖 (M)
- [x] 5.1 Prisma: Locale-патерн (`*_translations`), Category (дерево), Brand.
- [x] 5.2 Product, ProductVariant, product_categories (+ основна категорія), прапорці `isSale`/`isAntidron`.
- [x] 5.3 Attribute, AttributeValue, ProductAttributeValue, category ↔ attributes, provenance-поля (§67.10).
- [x] 5.4 Warehouse, Inventory, Price (типи цін, validFrom/To), Media, ProductMedia.
- [ ] 5.5 integration_mappings, sync_logs, redirects, seo_metadata.
- [ ] 5.6 Seed: дерево категорій з `categories.md`, склади, атрибути.
- [ ] 5.7 **Генератор фейкових даних: 50 000 товарів**, 500 брендів, ціни, залишки — щоб одразу тестувати продуктивність.
- ✅ `npm run db:reset` створює БД з категоріями й 50k товарів < 3 хв; ERD-діаграма згенерована в docs.

## Етап 6. Публічний Catalog API 🤖 (M)
- [ ] 6.1 Categories: дерево, за slug-шляхом, breadcrumbs, кеш у Redis + інвалідація.
- [ ] 6.2 Products: список з пагінацією, картка за slug (з варіантами, атрибутами, ціною, наявністю).
- [ ] 6.3 Brands: список, сторінка бренду; вітрини `/sale`, `/antidron`.
- [ ] 6.4 PricingService (актуальна ціна) і InventoryService (`available`) + unit-тести.
- [ ] 6.5 Локалізація відповідей (`?locale=` / header) з fallback на `uk`.
- ✅ Swagger показує всі endpoints; картка товару < 100 мс на 50k каталозі; тести на ціни/наявність.

## Етап 7. Пошук (Meilisearch) 🤖 (M)
- [ ] 7.1 Схема індексу: title, sku, brand, category, attributes, price, availability; фасети.
- [ ] 7.2 Job повного переіндексування + інкрементальні оновлення після змін товару.
- [ ] 7.3 `GET /api/v1/search`: typo tolerance, autocomplete, фільтри (категорія, бренд, ціна, атрибути), сортування.
- [ ] 7.4 Category listing теж через Meilisearch (фасетні фільтри), не через важкий SQL.
- ✅ Повний reindex 50k у фоні; пошук з помилкою («свароскі») знаходить Swarovski; фасети < 50 мс.

## Етап 8. Storefront 🤖 (L)
- [ ] 8.1 Design tokens з `brand.md` у Tailwind, shadcn/ui init, шрифти Merriweather + Inter.
- [ ] 8.2 Layout: header (мега-меню категорій), пошук, footer, мобільна версія.
- [ ] 8.3 i18n (uk/ru/en) + маршрутизація за рішенням 1.4.
- [ ] 8.4 Сторінка категорії: фільтри, сортування, пагінація, URL-стан фільтрів з правильним canonical.
- [ ] 8.5 Картка товару: галерея, характеристики, варіанти, наявність, ціна, related.
- [ ] 8.6 Бренди, сторінка бренду, `/sale`, `/antidron`, `/search` з autocomplete.
- [ ] 8.7 Головна (поки статична, у етапі 13 — з CMS), статичні сторінки (about, delivery...).
- [ ] 8.8 Базове SEO: metadata, breadcrumbs, JSON-LD Product/Offer/BreadcrumbList.
- [ ] 8.9 ISR/кешування + перевірка Lighthouse (LCP < 2.5 s, CLS < 0.1).
- ✅ Можна пройти головна → категорія → фільтр → товар → бренд → пошук на телефоні й ПК; Lighthouse ≥ 90.

## Етап 9. Admin: автентифікація та доступи 🤖 (M)
- [ ] 9.1 AdminUser, Role, Permission, сесії в Redis; Argon2id.
- [ ] 9.2 Вхід email + пароль → TOTP (QR для Google Authenticator), recovery codes, зашифрований secret.
- [ ] 9.3 HttpOnly/Secure/SameSite cookies, CSRF, logout all devices, rate limit на логін.
- [ ] 9.4 RBAC guard + 5 ролей + permissions; seed SUPER_ADMIN через CLI-команду.
- [ ] 9.5 AuditModule (before/after, ip, userAgent).
- [ ] 9.6 Admin layout `/admin`: sidebar за структурою §13, приховування пунктів без прав.
- ✅ E2E: логін + TOTP; CATALOG_MANAGER не бачить Users і отримує 403 від API напряму.

## Етап 10. Admin: каталог 🤖 (L)
- [ ] 10.1 Products list: TanStack Table, server-side пошук/фільтри/сортування/пагінація.
- [ ] 10.2 Редагування товару: переклади, категорії, атрибути, варіанти, SEO, медіа.
- [ ] 10.3 Bulk actions (publish, sale/antidron, категорія, бренд, статус, delete) через jobs.
- [ ] 10.4 Categories (drag&drop дерево), Brands, Attributes, Inventory (перегляд).
- [ ] 10.5 Media: завантаження в MinIO, image pipeline (resize → AVIF/WebP) у черзі `images`.
- [ ] 10.6 Зміна slug → пропозиція redirect 301.
- ✅ Зміна ціни/назви в адмінці з'являється на сайті й у пошуку; запис в Audit Log.

## Етап 11. Інтеграція Tria 🤖 + 👤 (L)
- [ ] 11.1 `TriaAdapter` інтерфейс + **MockTriaAdapter** (фейкові товари, ціни, залишки, замовлення).
- [ ] 11.2 Mapper + валідація + sync jobs: products, prices, inventory (ідемпотентні, з retry/backoff, dead-letter).
- [ ] 11.3 `/admin/integrations/tria`: статус, історія, помилки, «Sync now», retry.
- [ ] 11.4 👤 Дати доступ/документацію Tria → 🤖 реальний адаптер (API/БД/файли — за рішенням 1.2).
- [ ] 11.5 Плановий запуск sync (cron у BullMQ), розподілені локи в Redis.
- ✅ Sync 50k товарів з mock у фоні без блокування сайту; вимкнена Tria не ламає storefront.

## Етап 12. Кошик, checkout, замовлення 🤖 (L)
- [ ] 12.1 Customer: реєстрація, вхід, профіль (окремо від AdminUser).
- [ ] 12.2 Cart: гостьовий + авторизований + merge після логіну.
- [ ] 12.3 Checkout: backend перераховує все; обмеження для зброї (рішення 1.1); idempotency key.
- [ ] 12.4 Payment і Delivery через адаптери (спершу mock, потім реальні провайдери з 1.3).
- [ ] 12.5 Order + OrderItem snapshot + state machine + status history; резервування залишку.
- [ ] 12.6 Відправка замовлення в Tria (черга `tria-orders`, без дублів).
- [ ] 12.7 Email-листи (підтвердження, статуси) → видно в Mailpit.
- [ ] 12.8 Admin: Orders, Customers, Returns; кабінет покупця `/account/orders`.
- ✅ E2E: знайти → в кошик → оформити → лист у Mailpit → замовлення в адмінці → статус змінюється → потрапляє в Tria (mock) рівно 1 раз.

## Етап 13. CMS та налаштування 🤖 (M)
- [ ] 13.1 Pages, Blog/Новини (типи: Акція, Новина, Стаття, Відео, гайди), автори.
- [ ] 13.2 Banners, Menus, Footer, секції головної (блочний редактор).
- [ ] 13.3 Settings: контакти, валюта, доставка, оплата, соцмережі, SEO defaults.
- [ ] 13.4 Публікація без deploy: on-demand revalidation Next.js.
- ✅ Контент-менеджер змінює банер і статтю в адмінці — на сайті одразу, без перезапуску.

## Етап 14. SEO та GEO 🤖 (M)
- [ ] 14.1 Sitemap index (products-N, categories, brands, pages), robots.txt.
- [ ] 14.2 Redirects 301/302 (middleware), 404/410 для знятих товарів.
- [ ] 14.3 JSON-LD: Organization, WebSite, Brand, Article, FAQPage; hreflang.
- [ ] 14.4 `llms.txt` (вмикається в налаштуваннях), machine-readable feed.
- [ ] 14.5 Admin «SEO & GEO»: preview метаданих/JSON-LD, missing fields, повнота перекладів.
- ✅ Google Rich Results Test проходить для товару/статті; sitemap містить усі 50k товарів.

## Етап 15. Import / Export 🤖 (M)
- [ ] 15.1 Export товарів у CSV/XLSX (фоновий job → файл у MinIO → посилання).
- [ ] 15.2 Import: upload → validation → preview/звіт помилок → import → результат.
- ✅ Імпорт 20k рядків XLSX у фоні з звітом; помилкові рядки не ламають весь імпорт.

## Етап 16. Playground (dev-only) 🤖 (S)
- [ ] 16.1 `/playground`: API-запити, UI-компоненти, пошук, Tria mapping, jobs, email-шаблони, JSON-LD/SEO preview.
- [ ] 16.2 Повністю виключений з production-збірки (не просто прихований).
- ✅ У `NODE_ENV=production` `/playground` → 404 і відсутній у bundle.

## Етап 17. Якість і «готово локально» 🤖 + 👤 (M)
- [ ] 17.1 E2E (Playwright) на всі критичні сценарії §56.
- [ ] 17.2 Security-перевірка: CSP, CORS, rate limits, заголовки, `/security-review`.
- [ ] 17.3 Навантаження: 50k товарів, пошук, категорії, bulk-операції — вимір і оптимізація.
- [ ] 17.4 Production-збірка локально: `docker compose -f docker-compose.prod.yml up` (web, api, worker у контейнерах).
- [ ] 17.5 Документація: README запуску з нуля, `.env.example`, опис команд.
- [ ] 17.6 👤 Ручне тестування: пройти магазин як покупець і як кожна роль адміна.
- ✅ **Проєкт готовий локально**: з чистого клону `npm ci && npm run infra:up && npm run db:reset && npm run dev` піднімає весь магазин; усі тести зелені.

---

## Після роадмапу → Production (окремий план)
AWS (ECR, compute, RDS, ElastiCache, S3 + CloudFront), Cloudflare (DNS, WAF), GitHub OIDC deploy,
Sentry/метрики, бекапи з перевіркою відновлення, домен, реальні Tria/платежі/доставка.
