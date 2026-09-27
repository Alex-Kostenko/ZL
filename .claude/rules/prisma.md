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
