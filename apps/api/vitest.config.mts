import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Same monorepo-root .env as the app; process env still wins (CI).
const rootEnv = resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// esbuild drops decorator metadata, which Nest DI needs; SWC keeps it (reads tsconfig).
const plugins = [swc.vite({ module: { type: 'es6' } })];

export default defineConfig({
  test: {
    projects: [
      {
        plugins,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts'],
          env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
        },
      },
      {
        plugins,
        test: {
          name: 'integration',
          include: ['test/**/*.int-spec.ts'],
          globalSetup: ['test/global-setup.ts'],
          // One shared test DB and Redis: files must not run concurrently.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
          env: {
            NODE_ENV: 'test',
            LOG_LEVEL: 'silent',
            DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
            REDIS_URL: process.env.REDIS_URL_TEST ?? '',
          },
        },
      },
    ],
  },
});
