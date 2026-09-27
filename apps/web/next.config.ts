import { loadWebEnv } from '@ml/config';
import type { NextConfig } from 'next';
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

const RUNTIME_PHASES = new Set([
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
]);

// Wires src/i18n/request.ts (locale + messages per request) into the app.
const withNextIntl = createNextIntlPlugin();

export default function config(phase: string): NextConfig {
  // Fail fast on missing/invalid env; tooling phases (typegen, lint) don't need it.
  if (RUNTIME_PHASES.has(phase)) loadWebEnv();

  return withNextIntl({
    reactStrictMode: true,
    poweredByHeader: false,
    transpilePackages: ['@ml/ui'],
  });
}
