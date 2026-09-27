import { InjectQueue, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { QueueName } from './queues';

export class JobTimeoutError extends Error {
  constructor(ms: number) {
    super(`Job timed out after ${ms} ms`);
    this.name = 'JobTimeoutError';
  }
}

export interface DeadLetterPayload {
  queue: string;
  jobId: string;
  name: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  failedAt: string;
}

/**
 * Base for every BullMQ processor. Adds what §29 requires on top of BullMQ's retry/backoff:
 * - every log line inside `handle()` carries `jobId`, `queue`, `job`, `attempt`;
 * - a timeout (`timeoutMs`) with an AbortSignal for cooperative cancellation;
 * - start/finish/failure logging with duration;
 * - dead-letter: after the last attempt (or UnrecoverableError) the job is copied to `dead-letter`.
 *
 * Subclasses: `@Processor(QueueName.X)` + implement `handle()`. Handlers must be idempotent.
 */
export abstract class BaseProcessor<Data = unknown, Result = unknown> extends WorkerHost {
  /** Hard limit for one attempt. Override for long jobs (imports, full reindex). */
  protected readonly timeoutMs: number = 5 * 60_000;

  // Property injection keeps subclass constructors free for their own dependencies.
  @Inject(PinoLogger) protected readonly logger: PinoLogger;
  @InjectQueue(QueueName.DEAD_LETTER) private readonly deadLetter: Queue<DeadLetterPayload>;

  protected abstract handle(job: Job<Data>, signal: AbortSignal): Promise<Result>;

  async process(job: Job<Data>): Promise<Result> {
    this.logger.setContext(this.constructor.name);
    return this.logger.runInContext(() => this.run(job), {
      bindings: {
        jobId: job.id,
        queue: job.queueName,
        job: job.name,
        attempt: job.attemptsMade + 1,
      },
    });
  }

  private async run(job: Job<Data>): Promise<Result> {
    const started = performance.now();
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new JobTimeoutError(this.timeoutMs);
        controller.abort(error);
        reject(error);
      }, this.timeoutMs);
    });

    this.logger.debug('Job started');
    try {
      const result = await Promise.race([this.handle(job, controller.signal), timeout]);
      this.logger.info({ durationMs: Math.round(performance.now() - started) }, 'Job completed');
      return result;
    } catch (err) {
      await this.onFailure(job, err as Error, Math.round(performance.now() - started));
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async onFailure(job: Job<Data>, err: Error, durationMs: number): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinal = err instanceof UnrecoverableError || job.attemptsMade + 1 >= maxAttempts;
    if (!isFinal) {
      this.logger.warn({ err, durationMs }, 'Job attempt failed, will retry');
      return;
    }
    this.logger.error({ err, durationMs }, 'Job failed permanently, moving to dead-letter');
    if (job.queueName === QueueName.DEAD_LETTER) return;
    await this.deadLetter
      .add(
        job.queueName,
        {
          queue: job.queueName,
          jobId: String(job.id),
          name: job.name,
          data: job.data,
          failedReason: err.message,
          attemptsMade: job.attemptsMade + 1,
          failedAt: new Date().toISOString(),
        },
        // Deterministic id: re-running the same failed job never duplicates the dead letter.
        {
          jobId: `${job.queueName}__${job.id}`,
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      )
      .catch((dlqErr: Error) => this.logger.error({ err: dlqErr }, 'Failed to write dead letter'));
  }
}
