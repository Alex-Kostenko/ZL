import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests for pure storefront logic (URL state, formatting). No DOM, no API.
export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: { include: ['src/**/*.spec.ts'] },
});
