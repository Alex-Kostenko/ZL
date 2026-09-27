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
  const env = RUNTIME_PHASES.has(phase) ? loadWebEnv() : null;

  return withNextIntl({
    reactStrictMode: true,
    poweredByHeader: false,
    // Agent rules live in .claude/rules/web.md; don't let `next dev` write AGENTS.md/CLAUDE.md here.
    agentRules: false,
    transpilePackages: ['@ml/ui'],
    experimental: {
      // Tailwind CSS is small: inlining it removes the render-blocking stylesheet request, the
      // biggest LCP cost on slow mobile connections (Lighthouse, 8.9).
      inlineCss: true,
    },
    images: {
      formats: ['image/avif', 'image/webp'],
      remotePatterns: env ? [new URL(`${env.S3_PUBLIC_URL.replace(/\/$/, '')}/**`)] : [],
      // Dev media is served by MinIO on localhost, which the optimizer blocks by default.
      dangerouslyAllowLocalIP: env?.NODE_ENV === 'development',
    },
  });
}
