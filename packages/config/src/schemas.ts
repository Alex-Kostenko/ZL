import { z } from 'zod';

// Only development and production exist (§51); `test` is the test-runner mode.
const nodeEnv = z.enum(['development', 'production', 'test']).default('development');

const port = z.coerce.number().int().min(1).max(65535);

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const postgresUrl = z
  .url()
  .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
    message: 'must be a postgresql:// URL',
  });

const redisUrl = z.url().refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
  message: 'must be a redis:// or rediss:// URL',
});

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  API_PORT: port.default(4000),
  WEB_URL: z.url(),

  DATABASE_URL: postgresUrl,
  DATABASE_URL_TEST: postgresUrl.optional(),

  REDIS_URL: redisUrl,
  REDIS_URL_TEST: redisUrl.optional(),

  MEILI_HOST: z.url(),
  MEILI_MASTER_KEY: z.string().min(16),
  /** Index names are `<prefix>_products_<locale>`; integration tests use their own prefix. */
  MEILI_INDEX_PREFIX: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .default('ml'),

  S3_ENDPOINT: z.url().optional(), // unset in production → AWS default endpoint
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(8),
  S3_BUCKET_MEDIA: z.string().min(3),
  S3_BUCKET_PRIVATE: z.string().min(3),
  S3_FORCE_PATH_STYLE: bool.default(false),
  S3_PUBLIC_URL: z.url(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: port,
  MAIL_FROM: z.string().min(3),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

// Server-side only. Anything exposed to the browser must be NEXT_PUBLIC_* and added explicitly.
export const webEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  API_URL: z.url(),
  WEB_URL: z.url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
