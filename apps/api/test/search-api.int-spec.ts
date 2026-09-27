import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BrandsService } from '../src/catalog/brands/brands.service';
import { CategoriesService } from '../src/catalog/categories/categories.service';
import { QUEUE_PREFIX, QueueName } from '../src/jobs/queues';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductIndexService } from '../src/search/product-index.service';
import { SearchIndexer } from '../src/search/search-indexer.service';
import type { SearchResultDto } from '../src/search/search.dto';
import { SearchService } from '../src/search/search.service';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Search API (§12)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let indexes: ProductIndexService;
  let events: QueueEvents;

  const dropAll = async () => {
    for (const { uid } of await indexes.indexes()) await indexes.drop(uid);
  };

  const search = async (query: string, status = 200) => {
    const res = await request(app.getHttpServer()).get(`/api/v1/search?${query}`).expect(status);
    return res.body as SearchResultDto;
  };
  const slugs = (body: SearchResultDto) => body.items.map((i) => i.slug);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    indexes = app.get(ProductIndexService);
    const queue = app.get<Queue>(getQueueToken(QueueName.SEARCH_INDEX));
    events = new QueueEvents(QueueName.SEARCH_INDEX, {
      connection: queue.opts.connection,
      prefix: QUEUE_PREFIX,
    });
    await events.waitUntilReady();

    await resetDatabase(prisma);
    await Promise.all([
      app.get(CategoriesService).invalidateCache(),
      app.get(BrandsService).invalidateCache(),
      app.get(SearchService).invalidateFacetCache(),
    ]);
    await dropAll();

    const root = await prisma.category.create({
      data: {
        slug: 'zbroia',
        path: 'zbroia',
        translations: { create: { locale: 'uk', name: 'Зброя' } },
      },
    });
    const guns = await prisma.category.create({
      data: {
        slug: 'rushnytsi',
        path: 'zbroia/rushnytsi',
        depth: 1,
        parentId: root.id,
        translations: { create: { locale: 'uk', name: 'Рушниці' } },
      },
    });
    await prisma.category.create({
      data: {
        slug: 'arkhiv',
        path: 'arkhiv',
        isActive: false,
        translations: { create: { locale: 'uk', name: 'Архів' } },
      },
    });
    const beretta = await prisma.brand.create({ data: { name: 'Beretta', slug: 'beretta' } });
    const benelli = await prisma.brand.create({ data: { name: 'Benelli', slug: 'benelli' } });
    const kyiv = await prisma.warehouse.create({ data: { code: 'kyiv', name: 'Київ' } });
    const retail = await prisma.priceType.findUniqueOrThrow({ where: { code: 'retail' } });
    const calibre = await prisma.attribute.create({
      data: {
        code: 'calibre',
        type: 'SELECT',
        isFilterable: true,
        translations: {
          create: [
            { locale: 'uk', name: 'Калібр' },
            { locale: 'en', name: 'Calibre' },
          ],
        },
        values: {
          create: [
            {
              code: '12-70',
              position: 0,
              translations: { create: { locale: 'uk', label: '12/70' } },
            },
            {
              code: '20-76',
              position: 1,
              translations: { create: { locale: 'uk', label: '20/76' } },
            },
          ],
        },
      },
      include: { values: true },
    });
    const barrel = await prisma.attribute.create({
      data: {
        code: 'barrel_length',
        type: 'NUMBER',
        isFilterable: true,
        translations: { create: { locale: 'uk', name: 'Довжина ствола', unit: 'мм' } },
      },
    });

    const products = [
      {
        key: 'a400',
        title: 'Рушниця Beretta A400',
        brand: beretta,
        price: '45000',
        stock: 0,
        cal: '12-70',
        barrel: 710,
      },
      {
        key: 'silver',
        title: 'Рушниця Beretta Silver Pigeon',
        brand: beretta,
        price: '98000',
        stock: 2,
        cal: '20-76',
        barrel: 760,
      },
      {
        key: 'm2',
        title: 'Рушниця Benelli M2',
        brand: benelli,
        price: '52000',
        stock: 5,
        cal: '12-70',
        barrel: 660,
      },
    ];
    for (const [i, p] of products.entries()) {
      const product = await prisma.product.create({
        data: {
          sku: p.key.toUpperCase(),
          slug: p.key,
          brandId: p.brand.id,
          isPublished: true,
          publishedAt: new Date(Date.now() - i * 86_400_000),
          isSale: p.key === 'm2',
          categories: { create: { categoryId: guns.id } },
          translations: { create: { locale: 'uk', title: p.title } },
          variants: { create: { sku: `${p.key.toUpperCase()}-V` } },
        },
        include: { variants: true },
      });
      const variantId = product.variants[0]!.id;
      await prisma.price.create({ data: { variantId, priceTypeId: retail.id, price: p.price } });
      await prisma.inventory.create({
        data: { variantId, warehouseId: kyiv.id, quantity: p.stock },
      });
      await prisma.productAttributeValue.createMany({
        data: [
          {
            productId: product.id,
            attributeId: calibre.id,
            valueId: calibre.values.find((v) => v.code === p.cal)!.id,
          },
          { productId: product.id, attributeId: barrel.id, valueNumber: p.barrel },
        ],
      });
    }

    const job = await app.get(SearchIndexer).reindexAll();
    await job.waitUntilFinished(events, 60_000);
  });

  afterAll(async () => {
    await dropAll();
    await events?.close();
    await app?.close();
  });

  it('searches with typos and returns listing tiles', async () => {
    const body = await search('q=beretat');
    expect(slugs(body).sort()).toEqual(['a400', 'silver']);
    expect(body).toMatchObject({
      locale: 'uk',
      query: 'beretat',
      total: 2,
      page: 1,
      totalPages: 1,
    });
    expect(body.items.find((i) => i.slug === 'silver')).toMatchObject({
      price: { amount: '98000.00' },
      available: 2,
      inStock: true,
      brand: { slug: 'beretta', name: 'Beretta' },
    });
  });

  it('browses a category subtree, in stock first, then newest', async () => {
    const body = await search('category=zbroia');
    expect(slugs(body)).toEqual(['silver', 'm2', 'a400']);
    await search('category=arkhiv', 404);
    await search('category=nemaie', 404);
  });

  it('keeps facet counts disjunctive: a selected brand still shows the others', async () => {
    const body = await search('brand=beretta');
    expect(slugs(body).sort()).toEqual(['a400', 'silver']);
    expect(body.facets.brands).toEqual([
      { value: 'beretta', label: 'Beretta', count: 2, selected: true },
      { value: 'benelli', label: 'Benelli', count: 1, selected: false },
    ]);
    // Other facets are narrowed by the brand filter.
    expect(body.facets.attributes.find((a) => a.code === 'calibre')).toMatchObject({
      code: 'calibre',
      name: 'Калібр',
      values: [
        { value: '12-70', label: '12/70', count: 1, selected: false },
        { value: '20-76', label: '20/76', count: 1, selected: false },
      ],
    });
    expect(body.facets.attributes.find((a) => a.code === 'barrel_length')).toMatchObject({
      code: 'barrel_length',
      unit: 'мм',
      range: { min: 710, max: 760 },
    });
    expect(body.facets.price).toEqual({ min: 45000, max: 98000 });
    expect(body.facets.inStock).toEqual({ count: 1, selected: false });
    expect(body.facets.sale).toEqual({ count: 0, selected: false });
  });

  it('filters by attributes, price range and flags; sorts by price', async () => {
    expect(slugs(await search('attr=calibre:12-70&sort=price_desc'))).toEqual(['m2', 'a400']);
    expect(slugs(await search('attr=barrel_length:700..'))).toEqual(['silver', 'a400']);
    expect(slugs(await search('priceMin=50000&priceMax=60000'))).toEqual(['m2']);
    expect(slugs(await search('inStock=true&sort=price_asc'))).toEqual(['m2', 'silver']);
    expect(slugs(await search('sale=true'))).toEqual(['m2']);
    // Several brands; unknown attributes are ignored rather than failing old links.
    expect((await search('brand=beretta,benelli&attr=gone:x')).total).toBe(3);
  });

  it('reports the selected ranges', async () => {
    const body = await search('priceMin=50000&attr=barrel_length:..700');
    expect(body.facets.selectedPrice).toEqual({ min: 50000, max: null });
    expect(body.facets.attributes.find((a) => a.code === 'barrel_length')).toMatchObject({
      selectedRange: { min: null, max: 700 },
      // Bounds ignore the attribute's own filter.
      range: { min: 660, max: 760 },
    });
  });

  it('localizes facets and falls back to the default locale', async () => {
    const body = await search('locale=en&brand=benelli');
    expect(body.locale).toBe('en');
    expect(body.items[0]!.title).toBe('Рушниця Benelli M2');
    expect(body.facets.attributes.find((a) => a.code === 'calibre')?.name).toBe('Calibre');
  });

  it('validates input', async () => {
    await search('page=200&limit=100', 400);
    await search('priceMin=10&priceMax=5', 400);
    await search('attr=calibre', 400);
    await search('sort=cheap', 400);
  });

  it('suggests products, categories and brands as the user types', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/search/suggest?q=${encodeURIComponent('руш')}`)
      .expect(200);
    expect(res.body.products).toHaveLength(3);
    expect(res.body.categories).toEqual([{ path: 'zbroia/rushnytsi', name: 'Рушниці' }]);

    const brands = await request(app.getHttpServer())
      .get('/api/v1/search/suggest?q=ben')
      .expect(200);
    expect(brands.body.brands).toEqual([{ slug: 'benelli', name: 'Benelli' }]);
  });

  it('is not degraded while search works', async () => {
    expect((await search('category=zbroia')).degraded).toBe(false);
  });

  describe('when search is unavailable', () => {
    beforeAll(() => indexes.drop(indexes.uid('uk')));

    it('answers 503 to text search', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/search?q=a').expect(503);
      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('keeps browsing on the SQL path, newest first, without facets', async () => {
      const all = await search('category=zbroia');
      expect(all).toMatchObject({ degraded: true, total: 3, query: '' });
      expect(slugs(all)).toEqual(['a400', 'silver', 'm2']);

      const narrowed = await search('category=zbroia&brand=beretta,benelli&inStock=true&sale=true');
      expect(slugs(narrowed)).toEqual(['m2']);
      expect(narrowed.facets).toMatchObject({
        attributes: [],
        price: null,
        inStock: { count: 0, selected: true },
      });
      expect(narrowed.facets.brands.map((b) => b.value)).toEqual(['benelli', 'beretta']);

      expect((await search('brand=nemaie')).total).toBe(0);
      await search('category=nemaie', 404);
    });

    it('still suggests categories and brands', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/search/suggest?q=${encodeURIComponent('руш')}`)
        .expect(200);
      expect(res.body).toMatchObject({
        degraded: true,
        products: [],
        categories: [{ path: 'zbroia/rushnytsi', name: 'Рушниці' }],
      });
    });
  });
});
