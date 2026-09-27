import type { JobsOptions } from 'bullmq';

/** Jobs of the `search-index` queue (§29). Plain constants: also used by CLI scripts. */
export const SearchJob = {
  /** Rebuild every product index from PostgreSQL into fresh indexes, then swap them in. */
  REINDEX_ALL: 'reindex-all',
  /** Upsert or remove the given products in every locale's index. */
  SYNC_PRODUCTS: 'sync-products',
} as const;

export interface SyncProductsData {
  productIds: string[];
}

/** Payload of any job on the queue: a full reindex carries none. */
export type SearchJobData = SyncProductsData | Record<string, never>;

export interface ReindexAllResult {
  products: number;
  locales: string[];
  durationMs: number;
}

export interface SyncProductsResult {
  upserted: number;
  removed: number;
}

/** While a full reindex waits or runs, further requests join it instead of queueing another. */
export const REINDEX_ALL_DEDUP_ID = 'search-reindex-all';

/** Options of every full reindex request: joins a pending one; one attempt (the nightly run is the retry). */
export const REINDEX_ALL_OPTIONS = {
  deduplication: { id: REINDEX_ALL_DEDUP_ID },
  attempts: 1,
} satisfies JobsOptions;

/** Nightly full rebuild: a safety net for changes that emitted no sync event. */
export const REINDEX_SCHEDULER_ID = 'search-reindex-nightly';
export const REINDEX_CRON = '0 3 * * *';
export const REINDEX_TIMEZONE = 'Europe/Kyiv';

/** Products per sync job and per indexing batch (DB query + Meilisearch payload). */
export const PRODUCT_BATCH_SIZE = 500;
