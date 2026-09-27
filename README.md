# Мисливська лавка

Headless e-commerce for hunting, fishing and outdoor gear: Next.js storefront + admin, NestJS API, PostgreSQL, Redis, BullMQ, Meilisearch, ERP Tria.

## Requirements

- Node.js 24 (see `.nvmrc`), npm 11
- Docker Desktop (from stage 3)

## Getting started

```bash
npm ci
npm run dev        # web → http://localhost:3000, api → http://localhost:4000
```

## Scripts

| Command               | What it does                              |
| --------------------- | ----------------------------------------- |
| `npm run dev`         | Run all apps and package watchers (Turbo) |
| `npm run build`       | Build everything                          |
| `npm run lint`        | ESLint in every workspace                 |
| `npm run typecheck`   | `tsc --noEmit` in every workspace         |
| `npm test`            | Tests in every workspace                  |
| `npm run format`      | Prettier write                            |
| `npm i <pkg> -w <ws>` | Add a dependency to one workspace         |

## Layout

```
apps/web            Next.js (App Router): storefront + /admin
apps/api            NestJS: the only source of business logic, REST /api/v1
packages/ui         Presentational UI kit (consumed as TS source by Next)
packages/types      Shared domain types
packages/validation Shared validation schemas
packages/config     Typed env config
packages/api-client Client generated from OpenAPI
packages/tsconfig   Shared tsconfig presets
packages/eslint-config Shared ESLint flat configs
```

Shared runtime packages (`types`, `validation`, `config`, `api-client`) are built with tsdown to ESM + CJS, because the NestJS API runs as CommonJS.
