import { Job, UnrecoverableError } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseProcessor, JobTimeoutError } from './base.processor';

type Handler = (job: Job, signal: AbortSignal) => Promise<unknown>;

class TestProcessor extends BaseProcessor {
  protected override readonly timeoutMs = 50;
  constructor(private readonly handler: Handler) {
    super();
  }
  protected handle(job: Job, signal: AbortSignal): Promise<unknown> {
    return this.handler(job, signal);
  }
}

const logger = {
  setContext: vi.fn(),
  runInContext: <T>(fn: () => T) => fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
const deadLetter = { add: vi.fn().mockResolvedValue(undefined) };

function makeProcessor(handler: Handler): TestProcessor {
  const processor = new TestProcessor(handler);
  // Normally set by Nest property injection.
  Object.assign(processor, { logger, deadLetter });
  return processor;
}

function makeJob(attemptsMade: number, attempts = 3): Job {
  return {
    id: '42',
    name: 'sync',
    queueName: 'tria-prices',
    data: { sku: 'A1' },
    attemptsMade,
    opts: { attempts },
  } as unknown as Job;
}

describe('BaseProcessor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the handler result', async () => {
    const processor = makeProcessor(async () => 'done');
    await expect(processor.process(makeJob(0))).resolves.toBe('done');
    expect(deadLetter.add).not.toHaveBeenCalled();
  });

  it('does not dead-letter a failed attempt that will be retried', async () => {
    const processor = makeProcessor(async () => {
      throw new Error('transient');
    });
    await expect(processor.process(makeJob(0))).rejects.toThrow('transient');
    expect(deadLetter.add).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('dead-letters the last attempt with a deterministic id', async () => {
    const processor = makeProcessor(async () => {
      throw new Error('still broken');
    });
    await expect(processor.process(makeJob(2))).rejects.toThrow('still broken');
    expect(deadLetter.add).toHaveBeenCalledWith(
      'tria-prices',
      expect.objectContaining({ jobId: '42', failedReason: 'still broken', attemptsMade: 3 }),
      expect.objectContaining({ jobId: 'tria-prices__42' }),
    );
  });

  it('dead-letters an UnrecoverableError on the first attempt', async () => {
    const processor = makeProcessor(async () => {
      throw new UnrecoverableError('bad payload');
    });
    await expect(processor.process(makeJob(0))).rejects.toThrow('bad payload');
    expect(deadLetter.add).toHaveBeenCalledOnce();
  });

  it('fails with JobTimeoutError and aborts the signal when the handler is too slow', async () => {
    let signal: AbortSignal | undefined;
    const processor = makeProcessor((_job, s) => {
      signal = s;
      return new Promise(() => undefined);
    });
    await expect(processor.process(makeJob(0))).rejects.toBeInstanceOf(JobTimeoutError);
    expect(signal?.aborted).toBe(true);
  });
});
