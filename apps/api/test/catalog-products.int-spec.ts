import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const prismaCode = (e: unknown) => (e as Prisma.PrismaClientKnownRequestError).code;

describe('Catalog schema: products, variants, product categories (§6, §7)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let knives: { id: string };
  let tools: { id: string };
  let brand: { id: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    brand = await prisma.brand.create({ data: { name: 'Victorinox', slug: 'victorinox' } });
    knives = await prisma.category.create({ data: { slug: 'nozhi', path: 'nozhi' } });
    tools = await prisma.category.create({ data: { slug: 'instrumenty', path: 'instrumenty' } });
  });

  afterAll(async () => {
    await app?.close();
  });

  const createProduct = (sku: string, overrides: Partial<Prisma.ProductCreateInput> = {}) =>
    prisma.product.create({
      data: {
        sku,
        slug: sku.toLowerCase(),
        brand: { connect: { id: brand.id } },
        primaryCategory: { connect: { id: knives.id } },
        categories: { create: [{ categoryId: knives.id }, { categoryId: tools.id }] },
        translations: { create: [{ locale: 'uk', title: `Ніж ${sku}` }] },
        variants: { create: [{ sku: `${sku}-1` }] },
        ...overrides,
      },
    });

  it('creates a draft, unpublished product with translations, variants and categories', async () => {
    const product = await createProduct('SWISS-1', {
      variants: {
        create: [
          { sku: 'SWISS-1-RED', barcode: '7611160001', weightG: 85, position: 0 },
          { sku: 'SWISS-1-BLK', barcode: '7611160002', weightG: 85, position: 1 },
        ],
      },
    });

    const found = await prisma.product.findUniqueOrThrow({
      where: { slug: 'swiss-1' },
      include: {
        translations: true,
        variants: { orderBy: { position: 'asc' } },
        categories: true,
        primaryCategory: true,
      },
    });

    expect(found.id).toBe(product.id);
    expect(found.status).toBe('DRAFT');
    expect(found.isPublished).toBe(false);
    expect(found.isSale).toBe(false);
    expect(found.variants.map((v) => v.sku)).toEqual(['SWISS-1-RED', 'SWISS-1-BLK']);
    expect(found.categories).toHaveLength(2);
    expect(found.primaryCategory?.slug).toBe('nozhi');
  });

  it('keeps product and variant SKUs unique', async () => {
    await createProduct('A1');
    expect(prismaCode(await createProduct('A1').catch((e) => e))).toBe('P2002');

    const clash = await createProduct('B1', { variants: { create: [{ sku: 'A1-1' }] } }).catch(
      (e) => e,
    );
    expect(prismaCode(clash)).toBe('P2002');
  });

  it('filters /sale and /antidron by product flags, not categories', async () => {
    await createProduct('S1', { isSale: true, isPublished: true });
    await createProduct('D1', { isAntidron: true, isPublished: true });
    await createProduct('S2', { isSale: true, isPublished: false });

    const sale = await prisma.product.findMany({ where: { isPublished: true, isSale: true } });
    const antidron = await prisma.product.findMany({
      where: { isPublished: true, isAntidron: true },
    });

    expect(sale.map((p) => p.sku)).toEqual(['S1']);
    expect(antidron.map((p) => p.sku)).toEqual(['D1']);
  });

  it('deletes variants, translations and category links with the product', async () => {
    const product = await createProduct('DEL-1');
    await prisma.product.delete({ where: { id: product.id } });

    expect(await prisma.productVariant.count()).toBe(0);
    expect(await prisma.productTranslation.count()).toBe(0);
    expect(await prisma.productCategory.count()).toBe(0);
  });

  it('refuses to delete a brand or category that still has products', async () => {
    await createProduct('KEEP-1');

    const brandError = await prisma.brand.delete({ where: { id: brand.id } }).catch((e) => e);
    const categoryError = await prisma.category.delete({ where: { id: tools.id } }).catch((e) => e);

    expect(prismaCode(brandError)).toBe('P2003');
    expect(prismaCode(categoryError)).toBe('P2003');
  });
});
