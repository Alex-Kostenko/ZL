import type { ApiEnv } from '@ml/config';
import { Inject, Injectable } from '@nestjs/common';
import type { EnqueuedTaskPromise, Meilisearch, Task } from 'meilisearch';
import { API_ENV } from '../config/config.module';
import { LocaleService } from '../i18n/locale.service';
import { productIndexSettings, productIndexUid } from './product-index';

/** DI token for the Meilisearch client. Inject as `@Inject(MEILI) meili: Meilisearch`. */
export const MEILI = Symbol('MEILI');

/** Settings on a filled index re-index every document: allow minutes, not the SDK's 5 s. */
const TASK_TIMEOUT_MS = 10 * 60_000;

/** A product index of one locale. */
export interface ProductIndexRef {
  locale: string;
  uid: string;
}

/**
 * Owns the product indexes (§12): naming, creation and settings. One index per active locale,
 * `<MEILI_INDEX_PREFIX>_products_<locale>`, primary key `id`.
 */
@Injectable()
export class ProductIndexService {
  constructor(
    @Inject(MEILI) private readonly meili: Meilisearch,
    private readonly locales: LocaleService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  uid(locale: string, suffix = ''): string {
    return productIndexUid(this.env.MEILI_INDEX_PREFIX, locale) + suffix;
  }

  /** Indexes of all active locales. */
  async indexes(): Promise<ProductIndexRef[]> {
    const { codes } = await this.locales.settings();
    return codes.map((locale) => ({ locale, uid: this.uid(locale) }));
  }

  /**
   * Creates the index if it does not exist and applies the current settings. Idempotent: an
   * unchanged setting is a no-op for Meilisearch. `uid` may differ from `uid(locale)` (a
   * temporary index of a full reindex, swapped in afterwards).
   */
  async prepare(locale: string, uid = this.uid(locale)): Promise<void> {
    try {
      await wait(this.meili.createIndex(uid, { primaryKey: 'id' }));
    } catch (err) {
      if (!(err instanceof TaskFailedError && err.code === 'index_already_exists')) throw err;
    }
    await wait(this.meili.index(uid).updateSettings(productIndexSettings(locale)));
  }
}

export class TaskFailedError extends Error {
  constructor(readonly task: Task) {
    super(
      `Meilisearch task ${task.uid} (${task.type}) ${task.status}: ${task.error?.message ?? ''}`,
    );
    this.name = 'TaskFailedError';
  }

  get code(): string | undefined {
    return this.task.error?.code;
  }
}

/** Waits for an asynchronous Meilisearch task; a failed or canceled task throws. */
export async function wait(task: EnqueuedTaskPromise): Promise<Task> {
  const done = await task.waitTask({ timeout: TASK_TIMEOUT_MS });
  if (done.status !== 'succeeded') throw new TaskFailedError(done);
  return done;
}
