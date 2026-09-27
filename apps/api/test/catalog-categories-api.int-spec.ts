import { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CACHE_PREFIX } from '../src/cache/cache.service';
import { CategoriesService } from '../src/catalog/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS } from '../src/redis/redis.module';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Catalog API: categories (§9, §35, §59)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let categories: CategoriesService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redis = app.get(REDIS);
    categories = app.get(CategoriesService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await categories.invalidateCache();

    const root = await prisma.category.create({
      data: {
        slug: 'zbroia',
        path: 'zbroia',
        icon: 'crosshair',
        translations: {
          create: [
            { locale: 'uk', name: 'Зброя', description: 'Опис' },
            { locale: 'en', name: 'Weapons' },
          ],
        },
      },
    });
    const child = await prisma.category.create({
      data: {
        slug: 'nozhi',
        path: 'zbroia/nozhi',
        depth: 1,
        parentId: root.id,
        translations: { create: [{ locale: 'uk', name: 'Ножі' }] },
      },
    });
    await prisma.category.create({
      data: {
        slug: 'skladni',
        path: 'zbroia/nozhi/skladni',
        depth: 2,
        parentId: child.id,
        translations: { create: [{ locale: 'uk', name: 'Складні' }] },
      },
    });
    await prisma.category.create({
      data: {
        slug: 'arkhiv',
        path: 'zbroia/arkhiv',
        depth: 1,
        parentId: root.id,
        isActive: false,
        translations: { create: [{ locale: 'uk', name: 'Архів' }] },
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /categories returns the active tree in uk by default', async () => {
    const res = await http().get('/api/v1/categories').expect(200);
    expect(res.headers['content-language']).toBe('uk');
    expect(res.body.locale).toBe('uk');
    expect(res.body.items).toHaveLength(1);
    const [root] = res.body.items;
    expect(root).toMatchObject({ path: 'zbroia', name: 'Зброя', icon: 'crosshair', depth: 0 });
    expect(root.children.map((c: { path: string }) => c.path)).toEqual(['zbroia/nozhi']);
    expect(root.children[0].children[0]).toMatchObject({ name: 'Складні', children: [] });
  });

  it('localizes via ?locale= or Accept-Language with per-field fallback to uk', async () => {
    const en = await http().get('/api/v1/categories?locale=en').expect(200);
    expect(en.body.items[0].name).toBe('Weapons');
    expect(en.body.items[0].children[0].name).toBe('Ножі');

    const header = await http().get('/api/v1/categories').set('Accept-Language', 'en-US,uk;q=0.5');
    expect(header.headers['content-language']).toBe('en');

    const unsupported = await http().get('/api/v1/categories?locale=pl').expect(200);
    expect(unsupported.body.locale).toBe('uk');

    await http().get('/api/v1/categories?locale=%3Bdrop').expect(400);
  });

  it('GET /categories/by-path returns breadcrumbs and children', async () => {
    const res = await http().get('/api/v1/categories/by-path?path=zbroia/nozhi').expect(200);
    expect(res.body).toMatchObject({
      locale: 'uk',
      path: 'zbroia/nozhi',
      name: 'Ножі',
      description: null,
      breadcrumbs: [
        { name: 'Зброя', path: 'zbroia' },
        { name: 'Ножі', path: 'zbroia/nozhi' },
      ],
    });
    expect(res.body.children.map((c: { path: string }) => c.path)).toEqual([
      'zbroia/nozhi/skladni',
    ]);
  });

  it('answers 404 for unknown or inactive categories and 400 for a malformed path', async () => {
    const missing = await http().get('/api/v1/categories/by-path?path=nema').expect(404);
    expect(missing.body.code).toBe('NOT_FOUND');
    await http().get('/api/v1/categories/by-path?path=zbroia/arkhiv').expect(404);
    await http().get('/api/v1/categories/by-path?path=/zbroia/').expect(400);
    await http().get('/api/v1/categories/by-path').expect(400);
  });

  it('serves from Redis until the cache is invalidated', async () => {
    await http().get('/api/v1/categories').expect(200);
    expect(await redis.exists(`${CACHE_PREFIX}categories:uk`)).toBe(1);

    await prisma.categoryTranslation.update({
      where: { categoryId_locale: { categoryId: await rootId(), locale: 'uk' } },
      data: { name: 'Зброя (нова)' },
    });
    const stale = await http().get('/api/v1/categories').expect(200);
    expect(stale.body.items[0].name).toBe('Зброя');

    await categories.invalidateCache();
    const fresh = await http().get('/api/v1/categories').expect(200);
    expect(fresh.body.items[0].name).toBe('Зброя (нова)');
  });

  const rootId = async () =>
    (await prisma.category.findUniqueOrThrow({ where: { path: 'zbroia' } })).id;
});
