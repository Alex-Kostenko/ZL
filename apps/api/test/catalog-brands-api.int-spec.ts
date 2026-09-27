import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BrandsService } from '../src/catalog/brands/brands.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('Catalog API: brands and showcases (§6, §9)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await app.get(BrandsService).invalidateCache();

    const logo = await prisma.media.create({
      data: {
        key: 'brands/buck.png',
        filename: 'buck.png',
        mimeType: 'image/png',
        width: 200,
        height: 100,
        sizeBytes: 100,
      },
    });
    const buck = await prisma.brand.create({
      data: {
        name: 'Buck',
        slug: 'buck',
        country: 'US',
        website: 'https://buckknives.com',
        logoId: logo.id,
        translations: {
          create: [
            { locale: 'uk', description: 'Американські ножі' },
            { locale: 'en', description: null },
          ],
        },
      },
    });
    const akkar = await prisma.brand.create({ data: { name: 'akkar', slug: 'akkar' } });
    await prisma.brand.create({ data: { name: 'Empty', slug: 'empty' } });
    const hidden = await prisma.brand.create({
      data: { name: 'Old', slug: 'old', isActive: false },
    });
    await prisma.seoMetadata.createMany({
      data: [
        { entityType: 'BRAND', entityId: buck.id, locale: 'uk', title: 'Ножі Buck', noindex: true },
        { entityType: 'BRAND', entityId: buck.id, locale: 'en', description: 'Buck knives' },
      ],
    });

    const product = (sku: string, data: Record<string, unknown>) =>
      prisma.product.create({
        data: {
          sku,
          slug: sku.toLowerCase(),
          translations: { create: { locale: 'uk', title: sku } },
          variants: { create: { sku: `${sku}-1` } },
          ...data,
        },
      });
    await product('P-1', { brandId: buck.id, isPublished: true, isSale: true });
    await product('P-2', { brandId: buck.id, isPublished: true, isAntidron: true });
    await product('P-3', { brandId: buck.id });
    await product('P-4', { brandId: akkar.id, isPublished: true, isSale: true, isAntidron: true });
    await product('P-5', { brandId: hidden.id, isPublished: true });
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());
  const slugs = (body: { items: { slug: string }[] }) => body.items.map((i) => i.slug);

  describe('GET /brands', () => {
    it('lists active brands with published products, by name, with counts', async () => {
      const res = await http().get('/api/v1/brands?locale=en').expect(200);
      expect(res.headers['content-language']).toBe('en');
      expect(res.body.locale).toBe('en');
      expect(slugs(res.body)).toEqual(['akkar', 'buck']);
      expect(res.body.items[1]).toEqual({
        id: expect.any(String),
        slug: 'buck',
        name: 'Buck',
        country: 'US',
        logo: { url: expect.stringMatching(/\/brands\/buck\.png$/), width: 200, height: 100 },
        productCount: 2,
      });
      expect(res.body.items[0]).toMatchObject({ logo: null, productCount: 1 });
    });

    it('serves the cached list until invalidated', async () => {
      await http().get('/api/v1/brands').expect(200);
      await prisma.brand.update({ where: { slug: 'akkar' }, data: { isActive: false } });
      const cached = await http().get('/api/v1/brands').expect(200);
      expect(slugs(cached.body)).toEqual(['akkar', 'buck']);

      await app.get(BrandsService).invalidateCache();
      const fresh = await http().get('/api/v1/brands').expect(200);
      expect(slugs(fresh.body)).toEqual(['buck']);
    });
  });

  describe('GET /brands/:slug', () => {
    it('returns the brand page with description and SEO', async () => {
      const res = await http().get('/api/v1/brands/buck').expect(200);
      expect(res.body).toMatchObject({
        locale: 'uk',
        name: 'Buck',
        website: 'https://buckknives.com',
        description: 'Американські ножі',
        productCount: 2,
        seo: { title: 'Ножі Buck', description: null, noindex: true },
      });
    });

    it('localizes per field with fallback to uk', async () => {
      const res = await http().get('/api/v1/brands/buck?locale=en').expect(200);
      expect(res.body).toMatchObject({
        locale: 'en',
        description: 'Американські ножі',
        seo: { title: 'Ножі Buck', description: 'Buck knives', noindex: false },
      });
    });

    it('shows an active brand without products and hides inactive ones', async () => {
      const empty = await http().get('/api/v1/brands/empty').expect(200);
      expect(empty.body).toMatchObject({ productCount: 0, description: null });
      const missing = await http().get('/api/v1/brands/old').expect(404);
      expect(missing.body.code).toBe('NOT_FOUND');
      await http().get('/api/v1/brands/Bad_Slug').expect(400);
    });
  });

  describe('GET /products showcases', () => {
    it('filters by the sale and antidron flags', async () => {
      const sale = await http().get('/api/v1/products?sale=true').expect(200);
      expect(slugs(sale.body).sort()).toEqual(['p-1', 'p-4']);
      const antidron = await http().get('/api/v1/products?antidron=true').expect(200);
      expect(slugs(antidron.body).sort()).toEqual(['p-2', 'p-4']);
      const both = await http().get('/api/v1/products?sale=true&brand=akkar').expect(200);
      expect(slugs(both.body)).toEqual(['p-4']);
    });

    it('rejects non-boolean flags', async () => {
      await http().get('/api/v1/products?sale=1').expect(400);
      await http().get('/api/v1/products?antidron=yes').expect(400);
    });
  });
});
