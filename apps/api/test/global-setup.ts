import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import Redis from 'ioredis';

/**
 * Integration tests run against `ml_test` and a separate Redis DB, never the dev data.
 * Refuses to start if the test targets are missing or point at the dev ones.
 */
export default async function setup(): Promise<void> {
  const { DATABASE_URL, DATABASE_URL_TEST, REDIS_URL, REDIS_URL_TEST } = process.env;

  if (!DATABASE_URL_TEST || !REDIS_URL_TEST) {
    throw new Error('DATABASE_URL_TEST and REDIS_URL_TEST must be set (see .env.example)');
  }
  if (
    DATABASE_URL_TEST === DATABASE_URL ||
    !new URL(DATABASE_URL_TEST).pathname.endsWith('_test')
  ) {
    throw new Error('DATABASE_URL_TEST must point to a separate *_test database');
  }
  if (REDIS_URL_TEST === REDIS_URL) {
    throw new Error('REDIS_URL_TEST must differ from REDIS_URL');
  }

  // Apply migrations exactly as production does (no `migrate dev` drift prompts).
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: DATABASE_URL_TEST },
    stdio: 'pipe',
  });

  const redis = new Redis(REDIS_URL_TEST, { maxRetriesPerRequest: 1 });
  await redis.flushdb();
  await redis.quit();
}
