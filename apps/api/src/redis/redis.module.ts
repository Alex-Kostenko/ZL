import type { ApiEnv } from '@ml/config';
import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { API_ENV } from '../config/config.module';

/** DI token for the shared ioredis client (cache, locks, rate limits). Inject as `@Inject(REDIS) redis: Redis`. */
export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [API_ENV],
      useFactory: (env: ApiEnv): Redis => {
        const logger = new Logger('Redis');
        // Fail fast instead of queueing commands while disconnected: Redis is a cache, not a
        // primary store, so callers must degrade gracefully when it is down (§34).
        const client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectionName: 'api',
        });
        client.on('error', (err: Error) => logger.warn(`Redis error: ${err.message}`));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
