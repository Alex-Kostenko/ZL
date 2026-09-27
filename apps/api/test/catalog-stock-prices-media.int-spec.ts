import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const prismaCode = (e: unknown) => (e as Prisma.PrismaClientKnownRequestError).code;
const isCheckViolation = (e: unknown) =>
  /_chk|check constraint/i.test(String((e as Error).message));

describe('Catalog schema: inventory, prices, media (§10, §11, §16)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let product: { id: string };
  let variantId: string;
  let warehouseId: string;
  let retailId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const created = await prisma.product.create({
      data: { sku: 'P1', slug: 'p1', variants: { create: [{ sku: 'P1-1' }] } },
      include: { variants: true },
    });
    product = created;
    variantId = created.variants[0]!.id;
    warehouseId = (await prisma.warehouse.create({ data: { code: 'kyiv', name: 'Київ' } })).id;
    retailId = (await prisma.priceType.findUniqueOrThrow({ where: { code: 'retail' } })).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('inventory', () => {
    it('computes available = quantity - reserved in the database', async () => {
      await prisma.inventory.create({
        data: { variantId, warehouseId, quantity: 10, reserved: 3 },
      });
      const updated = await prisma.inventory.update({
        where: { variantId_warehouseId: { variantId, warehouseId } },
        data: { reserved: { increment: 2 } },
      });
      expect(updated.available).toBe(5);
    });

    it('sums availability across warehouses per variant', async () => {
      const lviv = await prisma.warehouse.create({ data: { code: 'lviv', name: 'Львів' } });
      await prisma.inventory.createMany({
        data: [
          { variantId, warehouseId, quantity: 4, reserved: 1 },
          { variantId, warehouseId: lviv.id, quantity: 2, reserved: 0 },
        ],
      });
      const total = await prisma.inventory.aggregate({
        where: { variantId },
        _sum: { available: true },
      });
      expect(total._sum.available).toBe(5);
    });

    it('rejects negative quantity or reserved', async () => {
      for (const data of [
        { variantId, warehouseId, quantity: -1 },
        { variantId, warehouseId, reserved: -1 },
      ]) {
        expect(isCheckViolation(await prisma.inventory.create({ data }).catch((e) => e))).toBe(
          true,
        );
      }
    });
  });

  describe('prices', () => {
    it('stores exact decimal amounts per price type and period', async () => {
      await prisma.price.create({
        data: {
          variantId,
          priceTypeId: retailId,
          price: '1299.99',
          salePrice: '999.50',
          oldPrice: '1499.00',
          validFrom: new Date('2026-09-01'),
          validTo: new Date('2026-10-01'),
        },
      });
      const price = await prisma.price.findFirstOrThrow({ where: { variantId } });
      expect(price.currency).toBe('UAH');
      expect(price.price.toFixed(2)).toBe('1299.99');
      expect(price.salePrice?.plus(price.price).toFixed(2)).toBe('2299.49');
    });

    it('rejects invalid amounts and periods', async () => {
      const base = { variantId, priceTypeId: retailId };
      for (const data of [
        { ...base, price: '-1' },
        { ...base, price: '100', salePrice: '150' },
        {
          ...base,
          price: '100',
          validFrom: new Date('2026-10-01'),
          validTo: new Date('2026-09-01'),
        },
      ]) {
        expect(isCheckViolation(await prisma.price.create({ data }).catch((e) => e))).toBe(true);
      }
    });

    it('has the retail price list seeded as default', async () => {
      const types = await prisma.priceType.findMany();
      expect(types.map((t) => [t.code, t.isDefault])).toEqual([['retail', true]]);
    });
  });

  describe('media', () => {
    const createMedia = (key: string) =>
      prisma.media.create({
        data: {
          key,
          filename: `${key}.jpg`,
          mimeType: 'image/jpeg',
          width: 1200,
          height: 800,
          sizeBytes: 120_000,
          translations: { create: [{ locale: 'uk', alt: 'Ніж' }] },
        },
      });

    it('orders a product gallery and allows only one primary image', async () => {
      const [a, b] = [await createMedia('a'), await createMedia('b')];
      await prisma.productMedia.createMany({
        data: [
          { productId: product.id, mediaId: a.id, position: 0, isPrimary: true },
          { productId: product.id, mediaId: b.id, position: 1 },
        ],
      });

      const gallery = await prisma.productMedia.findMany({
        where: { productId: product.id },
        orderBy: { position: 'asc' },
        include: { media: { include: { translations: true } } },
      });
      expect(gallery.map((g) => g.media.key)).toEqual(['a', 'b']);
      expect(gallery[0]?.media.translations[0]?.alt).toBe('Ніж');

      const secondPrimary = await prisma.productMedia
        .update({
          where: { productId_mediaId: { productId: product.id, mediaId: b.id } },
          data: { isPrimary: true },
        })
        .catch((e) => e);
      expect(prismaCode(secondPrimary)).toBe('P2002');
    });

    it('keeps media in use and clears optional brand logos on delete', async () => {
      const logo = await createMedia('logo');
      const brand = await prisma.brand.create({
        data: { name: 'Brand', slug: 'brand', logoId: logo.id },
      });
      const photo = await createMedia('photo');
      await prisma.productMedia.create({ data: { productId: product.id, mediaId: photo.id } });

      const error = await prisma.media.delete({ where: { id: photo.id } }).catch((e) => e);
      expect(prismaCode(error)).toBe('P2003');

      await prisma.media.delete({ where: { id: logo.id } });
      const reloaded = await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } });
      expect(reloaded.logoId).toBeNull();
    });
  });
});
