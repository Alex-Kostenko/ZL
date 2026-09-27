---
paths:
  - "apps/api/**"
  - "apps/worker/**"
---
# Backend (NestJS)
- Модуль = домен (§18). Controller тонкий → Service (логіка) → Prisma (data access). Не викликати Prisma з controller.
- Admin-роути під `/api/v1/admin/*`, guard з permission (`product.update` тощо) на КОЖНОМУ endpoint; суворіший rate limit.
- DTO з class-validator (`*.dto.ts`, Swagger-плагін сам описує поля); OpenAPI обов'язковий (з нього генерується клієнт). Після зміни API → `npm run api:generate` і закомітити `packages/api-client` (CI перевіряє).
- Критичні admin-дії → AuditModule (before/after). Статуси замовлення — лише через state machine.
- Зовнішні виклики та важкі задачі → BullMQ job з retry/backoff/timeout + idempotency key.
- Деталі: `.claude/docs/spec/architecture.md`, `tria-jobs.md`, `orders.md`, `admin-auth.md`.
