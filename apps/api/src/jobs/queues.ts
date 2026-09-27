import type { DefaultJobOptions } from 'bullmq';

/** All BullMQ queues (§29). Register processors per domain; names are part of Redis keys. */
export const QueueName = {
  SYSTEM: 'system',
  TRIA_PRODUCTS: 'tria-products',
  TRIA_INVENTORY: 'tria-inventory',
  TRIA_PRICES: 'tria-prices',
  TRIA_ORDERS: 'tria-orders',
  SEARCH_INDEX: 'search-index',
  IMAGES: 'images',
  EMAILS: 'emails',
  ORDERS: 'orders',
  /** Jobs that exhausted retries or failed unrecoverably; kept for review/retry (§29). */
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const ALL_QUEUES: readonly QueueName[] = Object.values(QueueName);

/**
 * Defaults for every job; override per `queue.add(...)`. For idempotency pass a deterministic
 * `jobId` without `:` (e.g. `order-123`): BullMQ ignores an add with an id that already exists (§30).
 */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};
