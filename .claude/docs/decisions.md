# Рішення та відкриті питання

## Прийняті рішення (з аналізу ТЗ)
- **Пакетний менеджер = npm (workspaces)**, не pnpm — рішення замовника (відхилення від §2/§62). Один `package-lock.json` у корені, у CI `npm ci`.
- **ORM = Prisma.** §62 каже «Prisma або Drizzle», але §33 однозначно фіксує Prisma. Діє §33.
- **CI/CD = GitHub Actions + AWS** (§53 уточнює «або аналог» з §62).
- **Роут новин = `/blog`**, у меню називається «Новини»; Article має поле `type` (PROMO/NEWS/ARTICLE/VIDEO + експертні типи).
- **Локально S3 = MinIO, email = Mailpit** (додатково до Postgres/Redis/Meilisearch з §52), щоб не залежати від AWS у dev.
- Розділ §66 у ТЗ відсутній (нумерація 65 → 67) — нічого не втрачено.
- **TypeScript ~6.0**, не 7.x: typescript-eslint підтримує лише `<6.1`. Оновити, коли typescript-eslint додасть підтримку TS 7.
- **ESLint 9** (flat config), не 10: не всі плагіни в eslint-config-next готові до 10.
- **Спільні пакети** (`types`, `validation`, `config`, `api-client`) збираються **tsdown** у ESM + CJS (`.mjs`/`.cjs`), бо NestJS працює в CommonJS. tsup відкинуто: його DTS-збірка ламається на TS 6 (`baseUrl`). `packages/ui` — без збірки, Next споживає TS-джерело через `transpilePackages`.
- Імена workspace-пакетів: `@ml/*`. Порти: web 3000, api 4000.
- **Env: один `.env` у корені monorepo** (шаблон `.env.example`), його читають docker compose, api і web. `@ml/config` (zod) шукає `.env` вгору від cwd; змінні процесу мають пріоритет над файлом; невалідний env → падіння при старті (імена змінних у помилці, без значень). Web валідує env лише у фазах dev/build/start.
- **Тестова БД `ml_test`** створюється init-скриптом Postgres (`infrastructure/docker/postgres/init`) — лише при першій ініціалізації volume (`npm run infra:reset`, щоб перестворити).
- **Образ MinIO = `pgsty/minio`** (community-збірка, версія закріплена в compose): офіційні `minio/minio`/`minio/mc` більше не публікуються. Той самий образ містить `mc` і створює бакети (`minio-init`, profile `init`, запускає `npm run infra:up`). Код працює з S3 API, тож образ можна замінити без змін у застосунку.
- **Prisma 7** (стабільна 7.10; `latest` у npm = 8.0 RC — не беремо). Схема й міграції в `apps/api/prisma`, конфіг `apps/api/prisma.config.ts` (сам читає кореневий `.env`). Генератор `prisma-client` (CJS) → `apps/api/src/generated/prisma` (у .gitignore), підключення через driver adapter `@prisma/adapter-pg`. `migrate dev` клієнт не генерує → Turbo-задача `db:generate` є залежністю dev/build/lint/typecheck/test. Env у Nest — через `@Inject(API_ENV)` з глобального `ConfigModule`. Команди: `npm run db:migrate | db:deploy | db:reset | db:studio`.
- **API-маршрути й OpenAPI**: глобальний префікс `/api` + URI-версіонування (default `v1`) → `/api/v1/...`. Swagger UI `/api/docs`, JSON `/api/docs-json` — реєструються лише при `NODE_ENV !== production` (у prod маршрутів немає, 404). Nest CLI-плагін `@nestjs/swagger` (`*.dto.ts`, `*.controller.ts`, `introspectComments`) сам описує DTO з TS-типів і JSDoc; operationId = `<Controller>_<method>` (стабільні імена для api-client, крок 4.7). `createOpenApiDocument()` у `src/openapi/swagger.ts` — єдине джерело документа.
- **Логування = `nestjs-pino`** (`src/logging`). Кожен рядок логу в межах запиту має `requestId` (AsyncLocalStorage + `quietReqLogger`), включно з `new Logger()` у сервісах. `requestId` береться з вхідного `X-Request-Id`, якщо він валідний (`[A-Za-z0-9._:-]{8,128}`), інакше — UUID; завжди повертається в заголовку відповіді `X-Request-Id`. Dev — `pino-pretty` в один рядок; інакше — JSON (`level` словом, `time` ISO). Тіла запитів не логуються; `authorization`, `cookie`, `set-cookie`, `*.password/token/totp/secret` → `[REDACTED]`. Swagger-запити не логуються.

## Відкриті питання (потрібна відповідь замовника)
1. **Продаж зброї та патронів онлайн.** Законодавство України обмежує дистанційний продаж і доставку вогнепальної зброї та боєприпасів. Потрібен прапорець товару / категорії (напр. `saleMode: ONLINE | RESERVE_ONLY | INFO_ONLY`), щоб checkout дозволяв лише резерв чи самовивіз з перевіркою документів.
2. **Спосіб підключення Tria** (API / БД / файлообмін / local bridge) і правила синхронізації цін (§27).
3. **Платіжний провайдер** (LiqPay / WayForPay / Monobank / Fondy?) — у ТЗ не визначено.
4. **Доставка** (Нова Пошта / Укрпошта / Meest / самовивіз) — інтеграції не описані.
5. **Compute на AWS** для web/api/workers (ECS Fargate / App Runner / EC2) — §53 залишає відкритим.
6. **Email-провайдер** (SES / Postmark / інший).
7. **Error tracking** (Sentry?) та метрики — інструмент не вибрано (§48–49).
8. **Hreflang/URL-стратегія локалей**: префікс `/ru/`, `/en/` при `uk` без префікса?
9. Дубль у дереві: «ЗБРОЯ › Холодна зброя та інструменти › Ножі» vs «НОЖІ ТА ЛІХТАРІ › Ножі та комплектуючі» — товар може належати кільком категоріям (`product_categories`), але треба визначити основну (для canonical/breadcrumbs).


## Порядок робіт
Див. `roadmap.md`.
