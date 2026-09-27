// Typed, validated environment config. Invalid or missing env → throw at startup.
import type { z } from 'zod';
import { loadEnvFile } from './load-env-file';
import { apiEnvSchema, webEnvSchema, type ApiEnv, type WebEnv } from './schemas';

export { loadEnvFile } from './load-env-file';
export { apiEnvSchema, webEnvSchema, type ApiEnv, type WebEnv } from './schemas';

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/** Validates `source` against `schema`. Error messages list variable names only, never values. */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined> = process.env,
): Readonly<z.infer<S>> {
  // Empty strings count as unset, so `FOO=` in .env triggers "required", not a format error.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return Object.freeze(result.data);
}

export function loadApiEnv(): Readonly<ApiEnv> {
  loadEnvFile();
  return parseEnv(apiEnvSchema);
}

export function loadWebEnv(): Readonly<WebEnv> {
  loadEnvFile();
  return parseEnv(webEnvSchema);
}
