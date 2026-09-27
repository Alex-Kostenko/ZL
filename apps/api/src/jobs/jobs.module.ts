import type { ApiEnv } from '@ml/config';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { API_ENV } from '../config/config.module';
import { ALL_QUEUES, DEFAULT_JOB_OPTIONS, QUEUE_PREFIX } from './queues';
import { SystemProcessor } from './system.processor';

/**
 * BullMQ infrastructure (§29). Queues are global: inject with `@InjectQueue(QueueName.X)`.
 * Processors live in their domain modules and extend BaseProcessor.
 * BullMQ opens its own Redis connections (blocking commands), separate from RedisModule.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => ({
        connection: { url: env.REDIS_URL },
        prefix: QUEUE_PREFIX,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(...ALL_QUEUES.map((name) => ({ name }))),
  ],
  providers: [SystemProcessor],
  exports: [BullModule],
})
export class JobsModule {}
