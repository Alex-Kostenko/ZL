import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DeadLetterPayload } from '../src/jobs/base.processor';
import { QueueName } from '../src/jobs/queues';
import { SystemJob } from '../src/jobs/system.processor';
import { createTestApp } from './utils/test-app';

describe('Jobs (API + Redis + BullMQ workers)', () => {
  let app: INestApplication;
  let system: Queue;
  let deadLetter: Queue<DeadLetterPayload>;
  let events: QueueEvents;

  beforeAll(async () => {
    app = await createTestApp();
    system = app.get<Queue>(getQueueToken(QueueName.SYSTEM));
    deadLetter = app.get<Queue<DeadLetterPayload>>(getQueueToken(QueueName.DEAD_LETTER));
    events = new QueueEvents(QueueName.SYSTEM, {
      connection: system.opts.connection,
      prefix: 'ml',
    });
    await events.waitUntilReady();
  });

  afterAll(async () => {
    await events?.close();
    await app?.close();
  });

  it('processes a job end to end', async () => {
    const job = await system.add(SystemJob.PING, {});
    await expect(job.waitUntilFinished(events, 10_000)).resolves.toMatchObject({ pong: true });
  });

  it('adds a job with the same jobId only once (idempotency)', async () => {
    const first = await system.add(SystemJob.PING, {}, { jobId: 'ping-idem-1' });
    const second = await system.add(SystemJob.PING, {}, { jobId: 'ping-idem-1' });
    expect(second.id).toBe(first.id);
    await first.waitUntilFinished(events, 10_000);
  });

  it('moves an unrecoverable failure to the dead-letter queue', async () => {
    const job = await system.add('unknown-job', { sku: 'A1' });
    await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow('Unknown job');

    const dead = await deadLetter.getJob(`${QueueName.SYSTEM}__${job.id}`);
    expect(dead?.data).toMatchObject({
      queue: QueueName.SYSTEM,
      jobId: job.id,
      name: 'unknown-job',
      data: { sku: 'A1' },
      attemptsMade: 1,
    });
  });
});
