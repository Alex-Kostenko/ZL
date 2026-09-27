import { defineConfig } from '@hey-api/openapi-ts';

// Generates a typed fetch SDK from openapi.json (exported by apps/api). Run `npm run api:generate`.
export default defineConfig({
  input: 'openapi.json',
  output: { path: 'src/generated', postProcess: ['prettier'] },
  plugins: ['@hey-api/client-fetch', '@hey-api/typescript', '@hey-api/sdk'],
});
