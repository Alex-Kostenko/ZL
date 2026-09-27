// Typed API client generated from apps/api OpenAPI (`npm run api:generate`). Never hand-write API types.
import { type Client, createClient, createConfig } from './generated/client';
import type { ErrorResponseDto } from './generated/types.gen';

export * from './generated';
export type { Client } from './generated/client';

export interface ApiClientOptions {
  /** API origin without path, e.g. `http://localhost:4000`. SDK functions add `/api/v1/...`. */
  baseUrl: string;
  headers?: Record<string, string>;
  /** Custom fetch (e.g. Next.js fetch with cache options, or a test double). */
  fetch?: typeof fetch;
}

/**
 * Creates an isolated client. Pass it to every SDK call: `appGetRoot({ client })`.
 * Prefer this over the generated global `client`, so server and browser never share config.
 */
export function createApiClient({ baseUrl, headers, fetch }: ApiClientOptions): Client {
  return createClient(createConfig({ baseUrl, headers, fetch }));
}

/** Narrows an SDK `error` to the unified API error format (`code`, `message`, `requestId`). */
export function isApiError(error: unknown): error is ErrorResponseDto {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'statusCode' in error &&
    'requestId' in error
  );
}
