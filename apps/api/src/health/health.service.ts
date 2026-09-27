import type { ApiEnv } from '@ml/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { API_ENV } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';
import type { DependencyCheckDto, ReadinessDto } from './health.dto';

const CHECK_TIMEOUT_MS = 2000;

class CheckTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CheckTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Readiness of hard dependencies (§50). Tria is intentionally not here: it must not gate traffic. */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  async readiness(): Promise<ReadinessDto> {
    const [database, redis, search] = await Promise.all([
      this.check('database', () => this.prisma.$queryRaw`SELECT 1`),
      this.check('redis', () => this.redis.ping()),
      this.check('search', () => this.pingMeilisearch()),
    ]);
    const allUp = [database, redis, search].every((c) => c.status === 'up');
    return { status: allUp ? 'ok' : 'error', checks: { database, redis, search } };
  }

  private async pingMeilisearch(): Promise<void> {
    const res = await fetch(new URL('/health', this.env.MEILI_HOST), {
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  private async check(name: string, probe: () => Promise<unknown>): Promise<DependencyCheckDto> {
    const started = performance.now();
    const latencyMs = (): number => Math.round(performance.now() - started);
    try {
      await withTimeout(probe(), CHECK_TIMEOUT_MS);
      return { status: 'up', latencyMs: latencyMs() };
    } catch (err) {
      // Full reason goes to logs only; the public response gets a generic label.
      this.logger.warn(`Readiness check "${name}" failed: ${(err as Error).message || err}`);
      const error = err instanceof CheckTimeoutError ? 'timeout' : 'unreachable';
      return { status: 'down', latencyMs: latencyMs(), error };
    }
  }
}
