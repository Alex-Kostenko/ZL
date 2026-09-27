import type { ApiEnv } from '@ml/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { API_ENV } from '../config/config.module';
import { LocaleService } from '../i18n/locale.service';
import { QueueName } from '../jobs/queues';
import { ProductIndexService } from './product-index.service';
import {
  PRODUCT_BATCH_SIZE,
  REINDEX_ALL_OPTIONS,
  REINDEX_CRON,
  REINDEX_SCHEDULER_ID,
  REINDEX_TIMEZONE,
  SearchJob,
  type SearchJobData,
  type SyncProductsData,
} from './search-jobs';

/**
 * Entry point for keeping search in sync (§12, §28): callers only enqueue, the
 * `search-index` worker does the work. Call `syncProducts()` after any change that affects a
 * product's document (product, translations, variants, prices, stock, attributes, media,
 * publication) and `reindexAll()` after changes that touch many products (category tree,
 * attribute definitions, locales).
 */
@Injectable()
export class SearchIndexer implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchIndexer.name);

  constructor(
    @InjectQueue(QueueName.SEARCH_INDEX) private readonly queue: Queue<SearchJobData>,
    private readonly indexes: ProductIndexService,
    private readonly locales: LocaleService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  /** The enqueued job, or the pending one this request joined. */
  reindexAll(): Promise<Job> {
    return this.queue.add(SearchJob.REINDEX_ALL, {}, REINDEX_ALL_OPTIONS);
  }

  async syncProducts(productIds: readonly string[]): Promise<Job<SearchJobData>[]> {
    const ids = [...new Set(productIds)];
    if (ids.length === 0) return [];
    const jobs = [];
    for (let i = 0; i < ids.length; i += PRODUCT_BATCH_SIZE) {
      const data: SyncProductsData = { productIds: ids.slice(i, i + PRODUCT_BATCH_SIZE) };
      jobs.push({ name: SearchJob.SYNC_PRODUCTS, data });
    }
    return this.queue.addBulk(jobs);
  }

  /**
   * One job at a time across all workers: a sync never interleaves with a full reindex, so an
   * update made during the rebuild is applied after the swap, not lost. Also schedules the
   * nightly rebuild and builds the indexes on first start. Search being down must not stop the
   * API, so failures here are only logged.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (this.env.NODE_ENV === 'test') return;
    try {
      await this.queue.setGlobalConcurrency(1);
      await this.queue.upsertJobScheduler(
        REINDEX_SCHEDULER_ID,
        { pattern: REINDEX_CRON, tz: REINDEX_TIMEZONE },
        { name: SearchJob.REINDEX_ALL, opts: { attempts: 1 } },
      );
      const { defaultLocale } = await this.locales.settings();
      if (!(await this.indexes.exists(this.indexes.uid(defaultLocale)))) {
        this.logger.log('Product index missing: full reindex enqueued');
        await this.reindexAll();
      }
    } catch (err) {
      this.logger.warn(`Search indexing setup skipped: ${(err as Error).message}`);
    }
  }
}
