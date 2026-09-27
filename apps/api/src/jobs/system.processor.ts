import { Processor } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { QueueName } from './queues';

export const SystemJob = {
  /** Smoke test of the whole pipeline: Redis → worker → logs with jobId. */
  PING: 'ping',
} as const;

/** Housekeeping queue; also the reference implementation of a BaseProcessor. */
@Processor(QueueName.SYSTEM)
export class SystemProcessor extends BaseProcessor<unknown, { pong: true; at: string }> {
  protected async handle(job: Job): Promise<{ pong: true; at: string }> {
    switch (job.name) {
      case SystemJob.PING:
        this.logger.info('pong');
        return { pong: true, at: new Date().toISOString() };
      default:
        // Retrying cannot fix an unknown job name.
        throw new UnrecoverableError(`Unknown job "${job.name}"`);
    }
  }
}
