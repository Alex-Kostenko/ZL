import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

/** Every cache key lives under this prefix (BullMQ uses `ml:<queue>`). */
export const CACHE_PREFIX = 'ml:cache:';

/**
 * Read-through JSON cache on Redis (§35). Redis is optional: on any Redis error the loader
 * result is served uncached, so the storefront keeps working without Redis (§34).
 * Keys are relative (`categories:uk`); the prefix is added here.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async getOrSet<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const fullKey = CACHE_PREFIX + key;
    const cached = await this.redis.get(fullKey).catch((err: Error) => this.warn('get', key, err));
    if (typeof cached === 'string') return JSON.parse(cached) as T;

    const value = await load();
    await this.redis
      .set(fullKey, JSON.stringify(value), 'EX', ttlSeconds)
      .catch((err: Error) => this.warn('set', key, err));
    return value;
  }

  /** Drops keys after a write. Failure is logged, not thrown: TTL bounds the staleness. */
  async del(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redis
      .unlink(...keys.map((k) => CACHE_PREFIX + k))
      .catch((err: Error) => this.warn('del', keys.join(','), err));
  }

  private warn(op: string, key: string, err: Error): undefined {
    this.logger.warn(`Cache ${op} failed for "${key}": ${err.message}`);
    return undefined;
  }
}
