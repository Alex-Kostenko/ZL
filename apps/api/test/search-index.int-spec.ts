import { INestApplication } from '@nestjs/common';
import type { Meilisearch } from 'meilisearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoriesService } from '../src/catalog/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductDocumentsService } from '../src/search/product-documents.service';
import type { ProductDocument } from '../src/search/product-index';
import { MEILI, ProductIndexService, wait } from '../src/search/product-index.service';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Search index: schema and documents (§12)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let meili: Meilisearch;
  let indexes: ProductIndexService;
  let uid: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    meili = app.get(MEILI);
    indexes = app.get(ProductIndexService);
    uid = indexes.uid('uk');
    await resetDatabase(prisma);
    await app.get(CategoriesService).invalidateCache();
    await wait(meili.deleteIndex(uid)).catch(() => undefined);

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
    const knives = await prisma.category.create({
      data: {
        slug: 'nozhi',
        path: 'zbroia/nozhi',
        depth: 1,
        parentId: root.id,
        translations: { create: { locale: 'uk', name: 'Ножі' } },
      },
    });
    const beretta = await prisma.brand.create({ data: { name: 'Beretta', slug: 'beretta' } });
    const buck = await prisma.brand.create({ data: { name: 'Buck', slug: 'buck' } });
    const kyiv = await prisma.warehouse.create({ data: { code: 'kyiv', name: 'Київ' } });
    const retail = await prisma.priceType.findUniqueOrThrow({ where: { code: 'retail' } });
    const calibre = await prisma.attribute.create({
      data: {
        code: 'calibre',
        type: 'SELECT',
        isFilterable: true,
        isSearchable: true,
        translations: { create: { locale: 'uk', name: 'Калібр' } },
        values: {
          create: [
            { code: '12-70', translations: { create: { locale: 'uk', label: '12/70' } } },
            { code: '20-76', translations: { create: { locale: 'uk', label: '20/76' } } },
          ],
        },
      },
      include: { values: { orderBy: { code: 'asc' } } },
    });

    const create = async (
      key: string,
      data: {
        title: string;
        brandId: string;
        categoryId: string;
        price: string;
        stock: number;
        calibre?: string;
        published?: boolean;
        daysAgo: number;
      },
    ) => {
      const p = await prisma.product.create({
        data: {
          sku: `SKU-${key}`,
          slug: key,
          brandId: data.brandId,
          primaryCategoryId: data.categoryId,
          isPublished: data.published ?? true,
          publishedAt: new Date(Date.now() - data.daysAgo * 86_400_000),
          categories: { create: { categoryId: data.categoryId } },
          translations: { create: { locale: 'uk', title: data.title } },
          variants: { create: { sku: `SKU-${key}-V` } },
        },
        include: { variants: true },
      });
      const variantId = p.variants[0]!.id;
      await prisma.price.create({ data: { variantId, priceTypeId: retail.id, price: data.price } });
      await prisma.inventory.create({
        data: { variantId, warehouseId: kyiv.id, quantity: data.stock },
      });
      const option = calibre.values.find((v) => v.code === data.calibre);
      if (option) {
        await prisma.productAttributeValue.create({
          data: { productId: p.id, attributeId: calibre.id, valueId: option.id },
        });
      }
      ids[key] = p.id;
    };

    await create('a400', {
      title: 'Рушниця Beretta A400',
      brandId: beretta.id,
      categoryId: guns.id,
      price: '45000.00',
      stock: 0,
      calibre: '12-70',
      daysAgo: 1,
    });
    await create('silver', {
      title: 'Рушниця Beretta Silver Pigeon',
      brandId: beretta.id,
      categoryId: guns.id,
      price: '98000.00',
      stock: 2,
      calibre: '20-76',
      daysAgo: 5,
    });
    await create('buck110', {
      title: 'Ніж Buck 110',
      brandId: buck.id,
      categoryId: knives.id,
      price: '3200.00',
      stock: 7,
      daysAgo: 3,
    });
    await create('draft', {
      title: 'Рушниця чернетка',
      brandId: beretta.id,
      categoryId: guns.id,
      price: '1.00',
      stock: 1,
      published: false,
      daysAgo: 0,
    });

    await indexes.prepare('uk');
    const batch = await app.get(ProductDocumentsService).build(Object.values(ids));
    expect(batch.removedIds).toEqual([ids.draft]);
    await wait(meili.index(uid).addDocuments(batch.documents.get('uk')!));
  });

  afterAll(async () => {
    await wait(meili.deleteIndex(uid)).catch(() => undefined);
    await app.close();
  });

  const search = (q: string, params: Record<string, unknown> = {}) =>
    meili.index<ProductDocument>(uid).search(q, params);

  it('builds documents for every active locale', async () => {
    const batch = await app.get(ProductDocumentsService).build([ids.a400!]);
    expect([...batch.documents.keys()].sort()).toEqual(['en', 'ru', 'uk']);
    // No en/ru translation yet: per-field fallback to uk.
    expect(batch.documents.get('en')![0]!.title).toBe('Рушниця Beretta A400');
  });

  it('applies the index settings', async () => {
    const settings = await meili.index(uid).getSettings();
    expect(settings.filterableAttributes).toContain('attrs');
    expect(settings.sortableAttributes).toEqual(
      expect.arrayContaining(['priceAmount', 'publishedAt']),
    );
    expect(settings.localizedAttributes).toEqual([{ attributePatterns: ['*'], locales: ['ukr'] }]);
    // Idempotent: preparing again succeeds on the existing index.
    await indexes.prepare('uk');
  });

  it('tolerates typos and matches by prefix, SKU and category name', async () => {
    expect((await search('bereta')).hits.map((h) => h.slug).sort()).toEqual(['a400', 'silver']);
    expect((await search('рушн')).hits).toHaveLength(2);
    // The exact SKU ranks first; others still match the shared "SKU" token (matchingStrategy: last).
    expect((await search('SKU-buck110-V')).hits[0]?.slug).toBe('buck110');
    expect((await search('ножі')).hits.map((h) => h.slug)).toEqual(['buck110']);
    expect((await search('12/70')).hits.map((h) => h.slug)).toEqual(['a400']);
  });

  it('returns only the listing tile fields', async () => {
    const [hit] = (await search('buck')).hits;
    expect(Object.keys(hit!).sort()).toEqual(
      [
        'available',
        'brand',
        'hasPriceRange',
        'id',
        'image',
        'inStock',
        'isAntidron',
        'isSale',
        'price',
        'sku',
        'slug',
        'title',
        'variantCount',
      ].sort(),
    );
    expect(hit).toMatchObject({ price: { amount: '3200.00' }, available: 7, inStock: true });
  });

  it('filters by category subtree, brand, price, stock and attributes, with facets', async () => {
    const guns = await search('', {
      filter: ['categories = "zbroia"', 'brand.slug = beretta'],
      facets: ['attrs.calibre', 'inStock'],
    });
    expect(guns.hits.map((h) => h.slug).sort()).toEqual(['a400', 'silver']);
    expect(guns.facetDistribution).toEqual({
      'attrs.calibre': { '12-70': 1, '20-76': 1 },
      inStock: { false: 1, true: 1 },
    });

    const cheap = await search('', { filter: 'priceAmount 1000 TO 50000 AND inStock = true' });
    expect(cheap.hits.map((h) => h.slug)).toEqual(['buck110']);

    const byCalibre = await search('', { filter: 'attrs.calibre = "20-76"' });
    expect(byCalibre.hits.map((h) => h.slug)).toEqual(['silver']);
  });

  it('orders in-stock products first, then newest; sorts by price on request', async () => {
    expect((await search('')).hits.map((h) => h.slug)).toEqual(['buck110', 'silver', 'a400']);
    expect((await search('', { sort: ['priceAmount:desc'] })).hits.map((h) => h.slug)).toEqual([
      'silver',
      'a400',
      'buck110',
    ]);
  });
});
