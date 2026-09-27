import { loadWebEnv } from '@ml/config';
import type { NextConfig } from 'next';
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants';

const RUNTIME_PHASES = new Set([
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
]);

export default function config(phase: string): NextConfig {
  // Fail fast on missing/invalid env; tooling phases (typegen, lint) don't need it.
  if (RUNTIME_PHASES.has(phase)) loadWebEnv();

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    transpilePackages: ['@ml/ui'],
  };
}
