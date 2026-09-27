import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Loads the nearest `.env` walking up from `startDir` (monorepo root .env is shared by all apps).
 * Variables already set in process.env always win, so platform-provided env overrides the file.
 * Production images must not contain a .env (see .dockerignore in step 17.4).
 */
export function loadEnvFile(startDir: string = process.cwd()): string | undefined {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
