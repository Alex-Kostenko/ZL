---
paths:
  - "**/prisma/**"
  - "**/*.prisma"
---
# Prisma / БД
- Зміни схеми тільки через `prisma migrate dev` (нова міграція), не редагувати застосовані міграції.
- Destructive зміни (drop/rename колонки) — expand → migrate data → contract у різних релізах (zero-downtime, §54).
- Переклади: окремі `*_translations` (entityId, locale, поля) з unique(entityId, locale).
- Tria-сутності мають `externalId` (unique) + `integration_mappings`; ціни в `prices`, залишки в `inventory` (variant × warehouse).
- Індекси під фільтри адмінки та slug; гроші — `Decimal`, не Float.
- Перелік таблиць: `.claude/docs/spec/infra.md` §32; моделі: `catalog.md`.
- CHECK, generated columns, часткові індекси Prisma не описує: `migrate dev --create-only` → дописати SQL у кінець міграції (секція «Hand-written») → застосувати → `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` має бути порожнім (без drift).
- Довідкові дані (locales, price_types) вставляються міграцією; у тестах їх не чистити (`PRESERVED_TABLES` у `test/utils/test-app.ts`).
