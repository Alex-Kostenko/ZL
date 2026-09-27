import { Processor } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import type { EnqueuedTaskPromise, Meilisearch } from 'meilisearch';
import { BaseProcessor } from '../jobs/base.processor';
import { QueueName } from '../jobs/queues';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDocumentsService } from './product-documents.service';
import { MEILI, ProductIndexService, wait } from './product-index.service';
import {
  PRODUCT_BATCH_SIZE,
  type ReindexAllResult,
  SearchJob,
  type SearchJobData,
  type SyncProductsData,
  type SyncProductsResult,
} from './search-jobs';
import { SearchIndexer } from './search-indexer.service';

/** Suffix of the index a full reindex fills before it is swapped with the live one. */
const NEXT_SUFFIX = '__next';

/**
 * `search-index` queue (§29). Both jobs are idempotent: documents are full replacements keyed
 * by product id, and a full reindex always starts from empty indexes.
 */
@Processor(QueueName.SEARCH_INDEX)
export class SearchIndexProcessor extends BaseProcessor<
  SearchJobData,
  ReindexAllResult | SyncProductsResult
> {
  protected override readonly timeoutMs = 30 * 60_000;

  constructor(
    @Inject(MEILI) private readonly meili: Meilisearch,
    private readonly prisma: PrismaService,
    private readonly indexes: ProductIndexService,
    private readonly documents: ProductDocumentsService,
    private readonly indexer: SearchIndexer,
  ) {
    super();
  }

  protected async handle(
    job: Job<SearchJobData>,
    signal: AbortSignal,
  ): Promise<ReindexAllResult | SyncProductsResult> {
    switch (job.name) {
      case SearchJob.REINDEX_ALL:
        return this.reindexAll(job, signal);
      case SearchJob.SYNC_PRODUCTS:
        return this.syncProducts((job.data as SyncProductsData).productIds);
      default:
        throw new UnrecoverableError(`Unknown job "${job.name}"`);
    }
  }

  /**
   * Zero-downtime rebuild: fill `<uid>__next` for every locale, then swap all pairs in one
   * atomic Meilisearch operation and drop the old data. The live indexes serve searches
   * throughout; a failure leaves them untouched.
   */
  private async reindexAll(job: Job, signal: AbortSignal): Promise<ReindexAllResult> {
    const started = performance.now();
    const refs = await this.indexes.indexes();
    const next = refs.map((r) => ({ ...r, next: r.uid + NEXT_SUFFIX }));

    for (const { locale, next: uid } of next) {
      await this.indexes.drop(uid);
      await this.indexes.prepare(locale, uid);
    }

    const total = await this.prisma.product.count({ where: { isPublished: true } });
    const tasks: EnqueuedTaskPromise[] = [];
    let products = 0;
    let cursor: string | undefined;
    for (;;) {
      signal.throwIfAborted();
      const page = await this.prisma.product.findMany({
        where: { isPublished: true, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: 'asc' },
        take: PRODUCT_BATCH_SIZE,
        select: { id: true },
      });
      if (page.length === 0) break;
      cursor = page.at(-1)!.id;

      const batch = await this.documents.build(page.map((p) => p.id));
      for (const { locale, next: uid } of next) {
        const docs = batch.documents.get(locale) ?? [];
        if (docs.length === 0) continue;
        // Only the enqueue is awaited: Meilisearch batches consecutive additions itself.
        const task = this.meili.index(uid).addDocuments(docs);
        await task;
        tasks.push(task);
      }
      products += page.length - batch.removedIds.length;
      await job.updateProgress(total ? Math.round((products / total) * 100) : 100);
    }
    // Every task must succeed: a failed batch would silently drop products from search.
    for (const task of tasks) await wait(task);
    signal.throwIfAborted();

    for (const { uid } of next) await this.indexes.create(uid);
    await wait(
      this.meili.swapIndexes(next.map((r) => ({ indexes: [r.uid, r.next], rename: false }))),
    );
    for (const { next: uid } of next) await this.indexes.drop(uid);

    const result = {
      products,
      locales: refs.map((r) => r.locale),
      durationMs: Math.round(performance.now() - started),
    };
    this.logger.info(result, 'Search reindex completed');
    return result;
  }

  private async syncProducts(productIds: string[]): Promise<SyncProductsResult> {
    const refs = await this.indexes.indexes();
    const missing = [];
    for (const ref of refs) if (!(await this.indexes.exists(ref.uid))) missing.push(ref.locale);
    if (missing.length) {
      // Never create a live index without settings; the full rebuild covers these products.
      this.logger.warn({ locales: missing }, 'Product index missing, full reindex enqueued');
      await this.indexer.reindexAll();
      return { upserted: 0, removed: 0 };
    }

    const batch = await this.documents.build(productIds);
    for (const { locale, uid } of refs) {
      const index = this.meili.index(uid);
      const docs = batch.documents.get(locale) ?? [];
      if (docs.length) await wait(index.addDocuments(docs));
      if (batch.removedIds.length) await wait(index.deleteDocuments(batch.removedIds));
    }
    return {
      upserted: batch.documents.get(refs[0]?.locale ?? '')?.length ?? 0,
      removed: batch.removedIds.length,
    };
  }
}
