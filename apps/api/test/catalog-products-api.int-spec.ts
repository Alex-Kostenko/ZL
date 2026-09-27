import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CategoriesService } from '../src/catalog/categories/categories.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

describe('Catalog API: products (§6, §7, §10, §11)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await app.get(CategoriesService).invalidateCache();

    const root = await prisma.category.create({
      data: {
        slug: 'zbroia',
        path: 'zbroia',
        translations: { create: { locale: 'uk', name: 'Зброя' } },
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
    const buck = await prisma.brand.create({ data: { name: 'Buck', slug: 'buck' } });
    const hidden = await prisma.brand.create({
      data: { name: 'Old', slug: 'old', isActive: false },
    });
    const kyiv = await prisma.warehouse.create({
      data: { code: 'kyiv', name: 'Київ', position: 0 },
    });
    const lviv = await prisma.warehouse.create({
      data: { code: 'lviv', name: 'Львів', position: 1 },
    });
    const retail = await prisma.priceType.findUniqueOrThrow({ where: { code: 'retail' } });

    const blade = await prisma.attribute.create({
      data: {
        code: 'blade_length',
        type: 'NUMBER',
        translations: {
          create: [
            { locale: 'uk', name: 'Довжина клинка', unit: 'мм' },
            { locale: 'en', name: 'Blade length', unit: 'mm' },
          ],
        },
      },
    });
    const colour = await prisma.attribute.create({
      data: {
        code: 'colour',
        type: 'SELECT',
        isVariantOption: true,
        translations: { create: { locale: 'uk', name: 'Колір' } },
        values: {
          create: [
            {
              code: 'black',
              position: 0,
              translations: { create: { locale: 'uk', label: 'Чорний' } },
            },
            {
              code: 'green',
              position: 1,
              translations: { create: { locale: 'uk', label: 'Зелений' } },
            },
          ],
        },
      },
      include: { values: true },
    });

    const knife = await prisma.product.create({
      data: {
        sku: 'K-1',
        slug: 'nizh-buck-110',
        brandId: buck.id,
        primaryCategoryId: knives.id,
        isPublished: true,
        publishedAt: daysFromNow(-1),
        isSale: true,
        categories: { create: { categoryId: knives.id } },
        translations: {
          create: [
            { locale: 'uk', title: 'Ніж Buck 110', description: 'Класика' },
            { locale: 'en', title: 'Buck 110 knife' },
          ],
        },
        variants: {
          create: [
            { sku: 'K-1-BLK', position: 0 },
            { sku: 'K-1-GRN', position: 1 },
            { sku: 'K-1-OLD', position: 2, status: 'INACTIVE' },
          ],
        },
      },
      include: { variants: { orderBy: { position: 'asc' } } },
    });
    const [black, green, inactive] = knife.variants.map((v) => v.id) as [string, string, string];

    await prisma.productAttributeValue.createMany({
      data: [
        { productId: knife.id, attributeId: blade.id, valueNumber: '95.0000' },
        {
          productId: knife.id,
          variantId: black,
          attributeId: colour.id,
          valueId: colour.values[0]!.id,
        },
        {
          productId: knife.id,
          variantId: green,
          attributeId: colour.id,
          valueId: colour.values[1]!.id,
        },
      ],
    });
    await prisma.price.createMany({
      data: [
        { variantId: black, priceTypeId: retail.id, price: '2000.00', oldPrice: '2400.00' },
        // Current promotion overrides the base price; the future one does not apply yet.
        {
          variantId: black,
          priceTypeId: retail.id,
          price: '2000.00',
          salePrice: '1500.00',
          validFrom: daysFromNow(-2),
          validTo: daysFromNow(2),
        },
        {
          variantId: black,
          priceTypeId: retail.id,
          price: '2000.00',
          salePrice: '100.00',
          validFrom: daysFromNow(5),
        },
        { variantId: green, priceTypeId: retail.id, price: '2100.00' },
        { variantId: inactive, priceTypeId: retail.id, price: '10.00' },
      ],
    });
    await prisma.inventory.createMany({
      data: [
        { variantId: black, warehouseId: kyiv.id, quantity: 5, reserved: 2 },
        { variantId: black, warehouseId: lviv.id, quantity: 1, reserved: 0 },
        { variantId: green, warehouseId: lviv.id, quantity: 0, reserved: 0 },
        { variantId: inactive, warehouseId: kyiv.id, quantity: 50, reserved: 0 },
      ],
    });
    const photo = await prisma.media.create({
      data: {
        key: 'products/buck-110.jpg',
        filename: 'buck-110.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 800,
        sizeBytes: 1000,
      },
    });
    await prisma.productMedia.create({
      data: { productId: knife.id, mediaId: photo.id, isPrimary: true },
    });

    await prisma.product.create({
      data: {
        sku: 'K-2',
        slug: 'nizh-staryi',
        brandId: hidden.id,
        isPublished: true,
        publishedAt: daysFromNow(-3),
        categories: { create: { categoryId: root.id } },
        translations: { create: { locale: 'uk', title: 'Старий ніж' } },
        variants: { create: { sku: 'K-2-1' } },
      },
    });
    await prisma.product.create({
      data: {
        sku: 'K-3',
        slug: 'nizh-chernetka',
        categories: { create: { categoryId: knives.id } },
        translations: { create: { locale: 'uk', title: 'Чернетка' } },
        variants: { create: { sku: 'K-3-1' } },
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('GET /products', () => {
    it('lists published products newest first with price and stock', async () => {
      const res = await http().get('/api/v1/products').expect(200);
      expect(res.headers['content-language']).toBe('uk');
      expect(res.body).toMatchObject({ locale: 'uk', page: 1, limit: 24, total: 2, totalPages: 1 });
      expect(res.body.items.map((p: { slug: string }) => p.slug)).toEqual([
        'nizh-buck-110',
        'nizh-staryi',
      ]);
      const [knife, old] = res.body.items;
      expect(knife).toMatchObject({
        title: 'Ніж Buck 110',
        brand: { slug: 'buck', name: 'Buck' },
        image: { url: expect.stringMatching(/\/products\/buck-110\.jpg$/), alt: 'Ніж Buck 110' },
        price: { currency: 'UAH', amount: '1500.00', oldAmount: '2000.00', discountPercent: 25 },
        hasPriceRange: true,
        available: 4,
        inStock: true,
        isSale: true,
        variantCount: 2,
      });
      expect(old).toMatchObject({ brand: null, image: null, price: null, inStock: false });
    });

    it('filters by category subtree and brand, and paginates', async () => {
      const root = await http().get('/api/v1/products?category=zbroia').expect(200);
      expect(root.body.total).toBe(2);
      const knives = await http().get('/api/v1/products?category=zbroia/nozhi').expect(200);
      expect(knives.body.items.map((p: { slug: string }) => p.slug)).toEqual(['nizh-buck-110']);
      const brand = await http().get('/api/v1/products?brand=buck').expect(200);
      expect(brand.body.total).toBe(1);

      const page2 = await http().get('/api/v1/products?limit=1&page=2').expect(200);
      expect(page2.body).toMatchObject({ total: 2, totalPages: 2, page: 2 });
      expect(page2.body.items[0].slug).toBe('nizh-staryi');
    });

    it('answers 404 for unknown filters and 400 for invalid paging', async () => {
      await http().get('/api/v1/products?category=nema').expect(404);
      await http().get('/api/v1/products?brand=old').expect(404);
      await http().get('/api/v1/products?limit=101').expect(400);
      await http().get('/api/v1/products?page=0').expect(400);
      await http().get('/api/v1/products?sort=price').expect(400);
    });
  });

  describe('GET /products/:slug', () => {
    it('returns the product page with variants, characteristics and breadcrumbs', async () => {
      const res = await http().get('/api/v1/products/nizh-buck-110').expect(200);
      expect(res.body).toMatchObject({
        locale: 'uk',
        sku: 'K-1',
        title: 'Ніж Buck 110',
        description: 'Класика',
        category: { path: 'zbroia/nozhi', name: 'Ножі' },
        breadcrumbs: [
          { name: 'Зброя', path: 'zbroia' },
          { name: 'Ножі', path: 'zbroia/nozhi' },
        ],
        attributes: [
          {
            code: 'blade_length',
            name: 'Довжина клинка',
            unit: 'мм',
            values: [{ text: '95', code: null }],
          },
        ],
        price: { amount: '1500.00' },
        hasPriceRange: true,
        stock: { available: 4, inStock: true },
      });
      expect(res.body.images).toHaveLength(1);
      expect(res.body.variants).toHaveLength(2);
      const [black, green] = res.body.variants;
      expect(black).toMatchObject({
        sku: 'K-1-BLK',
        options: [{ code: 'colour', values: [{ text: 'Чорний', code: 'black' }] }],
        price: { amount: '1500.00', oldAmount: '2000.00' },
        stock: {
          available: 4,
          inStock: true,
          warehouses: [
            { code: 'kyiv', name: 'Київ', available: 3 },
            { code: 'lviv', name: 'Львів', available: 1 },
          ],
        },
      });
      expect(green).toMatchObject({
        sku: 'K-1-GRN',
        price: { amount: '2100.00', oldAmount: null },
        stock: { available: 0, inStock: false, warehouses: [] },
      });
    });

    it('localizes with per-field fallback to uk', async () => {
      const res = await http().get('/api/v1/products/nizh-buck-110?locale=en').expect(200);
      expect(res.headers['content-language']).toBe('en');
      expect(res.body).toMatchObject({
        title: 'Buck 110 knife',
        description: 'Класика',
        attributes: [{ name: 'Blade length', unit: 'mm' }],
      });
      expect(res.body.variants[0].options[0]).toMatchObject({
        name: 'Колір',
        values: [{ text: 'Чорний' }],
      });
    });

    it('answers 404 for unpublished or unknown products and 400 for a malformed slug', async () => {
      await http().get('/api/v1/products/nizh-chernetka').expect(404);
      const missing = await http().get('/api/v1/products/nema').expect(404);
      expect(missing.body.code).toBe('NOT_FOUND');
      await http().get('/api/v1/products/Bad_Slug').expect(400);
    });
  });
});
