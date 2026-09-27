/* eslint-disable no-console -- CLI script output */
import { loadApiEnv } from '@ml/config';
import { Queue } from 'bullmq';
import { QUEUE_PREFIX, QueueName } from '../jobs/queues';
import { REINDEX_ALL_OPTIONS, SearchJob } from './search-jobs';

/**
 * `npm run search:reindex`: enqueues a full rebuild of the product indexes (e.g. after
 * `db:reset`). Only enqueues — the running API's `search-index` worker does the work (§29);
 * a rebuild already waiting or running absorbs this request.
 */
async function main(): Promise<void> {
  const env = loadApiEnv();
  const queue = new Queue(QueueName.SEARCH_INDEX, {
    connection: { url: env.REDIS_URL },
    prefix: QUEUE_PREFIX,
  });
  try {
    const job = await queue.add(SearchJob.REINDEX_ALL, {}, REINDEX_ALL_OPTIONS);
    console.log(`Full search reindex enqueued (job ${job.id}); progress: /api/queues (dev)`);
  } finally {
    await queue.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
