import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma CLI runs before @ml/config is built, so load the monorepo root .env directly.
// Process env still wins (CI / production set DATABASE_URL explicitly).
const rootEnv = resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `generate` needs no connection; placeholder keeps it working without a .env (fresh `npm ci`).
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://placeholder' },
});
