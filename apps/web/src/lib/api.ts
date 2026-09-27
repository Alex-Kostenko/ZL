import { createApiClient } from '@ml/api-client';
import { loadWebEnv } from '@ml/config';

/**
 * Server-side API client (Server Components, Route Handlers, Server Actions).
 * Next.js talks to data only through the API and this generated client (rule 1).
 */
export const api = createApiClient({ baseUrl: loadWebEnv().API_URL });
