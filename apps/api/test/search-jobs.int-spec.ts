import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Job, Queue, QueueEvents } from 'bullmq';
import type { Meilisearch } from 'meilisearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoriesService } from '../src/catalog/categories/categories.service';
import { QUEUE_PREFIX, QueueName } from '../src/jobs/queues';
import { PrismaService } from '../src/prisma/prisma.service';
import type { ProductDocument } from '../src/search/product-index';
import { MEILI, ProductIndexService } from '../src/search/product-index.service';
import { SearchIndexer } from '../src/search/search-indexer.service';
import { SearchJob } from '../src/search/search-jobs';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Search indexing jobs (§12, §29)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let meili: Meilisearch;
  let indexes: ProductIndexService;
  let indexer: SearchIndexer;
  let queue: Queue;
  let events: QueueEvents;
  let categoryId: string;

  const finished = <T>(job: Job) => job.waitUntilFinished(events, 60_000) as Promise<T>;

  const titles = async (locale: string) => {
    const res = await meili
      .index<ProductDocument>(indexes.uid(locale))
      .search('', { sort: ['title:asc'] });
    return res.hits.map((h) => h.title);
  };

  const createProduct = async (key: string, title: string, isPublished = true) => {
    const p = await prisma.product.create({
      data: {
        sku: key,
        slug: key,
        isPublished,
        publishedAt: new Date(),
        categories: { create: { categoryId } },
        translations: { create: { locale: 'uk', title } },
        variants: { create: { sku: `${key}-V` } },
      },
    });
    return p.id;
  };

  const dropAll = async () => {
    for (const { uid } of await indexes.indexes()) {
      await indexes.drop(uid);
      await indexes.drop(`${uid}__next`);
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    meili = app.get(MEILI);
    indexes = app.get(ProductIndexService);
    indexer = app.get(SearchIndexer);
    queue = app.get<Queue>(getQueueToken(QueueName.SEARCH_INDEX));
    events = new QueueEvents(QueueName.SEARCH_INDEX, {
      connection: queue.opts.connection,
      prefix: QUEUE_PREFIX,
    });
    await events.waitUntilReady();

    await resetDatabase(prisma);
    await app.get(CategoriesService).invalidateCache();
    await dropAll();
    const category = await prisma.category.create({
      data: {
        slug: 'nozhi',
        path: 'nozhi',
        translations: { create: { locale: 'uk', name: 'Ножі' } },
      },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await dropAll();
    await events?.close();
    await app?.close();
  });

  it('rebuilds every locale index from scratch and swaps it in', async () => {
    await createProduct('a', 'Ніж Alpha');
    await createProduct('b', 'Ніж Bravo');
    await createProduct('draft', 'Ніж чернетка', false);

    const job = await indexer.reindexAll();
    // A second request while the first is pending joins it (deduplication).
    expect((await indexer.reindexAll()).id).toBe(job.id);

    await expect(finished(job)).resolves.toMatchObject({
      products: 2,
      locales: expect.arrayContaining(['uk', 'ru', 'en']),
    });
    expect(await titles('uk')).toEqual(['Ніж Alpha', 'Ніж Bravo']);
    expect(await titles('en')).toEqual(['Ніж Alpha', 'Ніж Bravo']);
    expect(await indexes.exists(`${indexes.uid('uk')}__next`)).toBe(false);
    // Settings came with the swapped index.
    const settings = await meili.index(indexes.uid('uk')).getSettings();
    expect(settings.sortableAttributes).toContain('priceAmount');
  });

  it('drops products that disappeared since the last rebuild', async () => {
    await prisma.product.deleteMany({ where: { sku: 'b' } });
    await finished(await indexer.reindexAll());
    expect(await titles('uk')).toEqual(['Ніж Alpha']);
  });

  it('upserts changed products and removes unpublished ones', async () => {
    const charlie = await createProduct('c', 'Ніж Charlie');
    const alpha = (await prisma.product.findUniqueOrThrow({ where: { sku: 'a' } })).id;
    await prisma.productTranslation.update({
      where: { productId_locale: { productId: alpha, locale: 'uk' } },
      data: { title: 'Ніж Alpha II' },
    });

    const [job] = await indexer.syncProducts([alpha, charlie, alpha]);
    await expect(finished(job!)).resolves.toEqual({ upserted: 2, removed: 0 });
    expect(await titles('uk')).toEqual(['Ніж Alpha II', 'Ніж Charlie']);

    await prisma.product.update({ where: { id: charlie }, data: { isPublished: false } });
    const [unpublish] = await indexer.syncProducts([charlie]);
    await expect(finished(unpublish!)).resolves.toEqual({ upserted: 0, removed: 1 });
    expect(await titles('ru')).toEqual(['Ніж Alpha II']);
  });

  it('splits large syncs into batches', async () => {
    const ids = Array.from(
      { length: 1001 },
      (_, i) => `00000000-0000-7000-8000-${String(i).padStart(12, '0')}`,
    );
    const jobs = await indexer.syncProducts(ids);
    expect(jobs.map((j) => (j.data as { productIds: string[] }).productIds.length)).toEqual([
      500, 500, 1,
    ]);
    await Promise.all(jobs.map(finished));
  });

  it('falls back to a full rebuild when the live index is missing', async () => {
    await indexes.drop(indexes.uid('uk'));
    const alpha = (await prisma.product.findUniqueOrThrow({ where: { sku: 'a' } })).id;

    const [job] = await indexer.syncProducts([alpha]);
    await expect(finished(job!)).resolves.toEqual({ upserted: 0, removed: 0 });

    const [rebuild] = (await queue.getJobs(['waiting', 'active', 'completed']))
      .filter((j) => j.name === SearchJob.REINDEX_ALL)
      .sort((a, b) => b.timestamp - a.timestamp);
    expect(rebuild!.timestamp).toBeGreaterThanOrEqual(job!.timestamp);
    await finished(rebuild!);
    expect(await titles('uk')).toEqual(['Ніж Alpha II']);
  });
});
