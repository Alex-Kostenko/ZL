import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const prismaCode = (e: unknown) => (e as Prisma.PrismaClientKnownRequestError).code;

describe('Catalog schema: attributes, category attributes, product values (§8, §67.10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let product: { id: string; variants: { id: string; sku: string }[] };
  let category: { id: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    category = await prisma.category.create({ data: { slug: 'patrony', path: 'patrony' } });
    product = await prisma.product.create({
      data: {
        sku: 'AMMO-1',
        slug: 'ammo-1',
        primaryCategoryId: category.id,
        variants: { create: [{ sku: 'AMMO-1-12' }, { sku: 'AMMO-1-16', position: 1 }] },
      },
      include: { variants: { orderBy: { position: 'asc' } } },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const createSelect = (code: string, options: string[]) =>
    prisma.attribute.create({
      data: {
        code,
        type: 'SELECT',
        isFilterable: true,
        translations: { create: [{ locale: 'uk', name: code }] },
        values: {
          create: options.map((o, i) => ({
            code: o,
            position: i,
            translations: { create: [{ locale: 'uk', label: o }] },
          })),
        },
      },
      include: { values: { orderBy: { position: 'asc' } } },
    });

  it('stores typed values per product and per variant with provenance', async () => {
    const caliber = await createSelect('caliber', ['12', '16']);
    const length = await prisma.attribute.create({
      data: {
        code: 'shell_length',
        type: 'NUMBER',
        translations: { create: [{ locale: 'uk', name: 'Довжина гільзи', unit: 'мм' }] },
      },
    });
    const [v12, v16] = product.variants;
    const syncedAt = new Date('2026-09-01T10:00:00Z');

    await prisma.productAttributeValue.createMany({
      data: [
        { productId: product.id, attributeId: length.id, valueNumber: 70 },
        {
          productId: product.id,
          variantId: v12!.id,
          attributeId: caliber.id,
          valueId: caliber.values[0]!.id,
          source: 'TRIA',
          sourceExternalId: 'TRIA-778',
          sourceUpdatedAt: syncedAt,
        },
        {
          productId: product.id,
          variantId: v16!.id,
          attributeId: caliber.id,
          valueId: caliber.values[1]!.id,
        },
      ],
    });

    const values = await prisma.productAttributeValue.findMany({
      where: { productId: product.id },
      include: { value: true, variant: true },
    });
    expect(values).toHaveLength(3);
    const shellLength = values.find((v) => v.attributeId === length.id);
    expect(shellLength?.valueNumber?.toString()).toBe('70');
    const fromTria = values.find((v) => v.source === 'TRIA');
    expect(fromTria).toMatchObject({ sourceExternalId: 'TRIA-778', sourceUpdatedAt: syncedAt });
    expect(fromTria?.variant?.sku).toBe('AMMO-1-12');
  });

  it('finds products by a facet value (the filter query shape)', async () => {
    const caliber = await createSelect('caliber', ['12', '16']);
    await prisma.productAttributeValue.create({
      data: { productId: product.id, attributeId: caliber.id, valueId: caliber.values[0]!.id },
    });

    const found = await prisma.product.findMany({
      where: { attributeValues: { some: { attributeId: caliber.id, value: { code: '12' } } } },
    });
    expect(found.map((p) => p.sku)).toEqual(['AMMO-1']);
  });

  it('enforces exactly one value column and a valid range in the database', async () => {
    const magnification = await prisma.attribute.create({
      data: { code: 'magnification', type: 'RANGE' },
    });
    const base = { productId: product.id, attributeId: magnification.id };

    await expect(
      prisma.productAttributeValue.create({ data: { ...base, valueNumber: 3, valueNumberTo: 9 } }),
    ).resolves.toBeTruthy();

    for (const data of [
      { ...base },
      { ...base, valueNumber: 3, valueText: 'x' },
      { ...base, valueNumber: 9, valueNumberTo: 3 },
    ]) {
      const error = await prisma.productAttributeValue.create({ data }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(String(error.message)).toMatch(/_chk|check constraint/i);
    }
  });

  it('keeps option codes unique per attribute only', async () => {
    const caliber = await createSelect('caliber', ['12']);
    await expect(createSelect('gauge', ['12'])).resolves.toBeTruthy();

    const duplicate = await prisma.attributeValue
      .create({ data: { attributeId: caliber.id, code: '12' } })
      .catch((e) => e);
    expect(prismaCode(duplicate)).toBe('P2002');
  });

  it('links attributes to categories and blocks deleting an attribute in use', async () => {
    const caliber = await createSelect('caliber', ['12']);
    await prisma.categoryAttribute.create({
      data: { categoryId: category.id, attributeId: caliber.id, isRequired: true },
    });

    const withAttributes = await prisma.category.findUniqueOrThrow({
      where: { id: category.id },
      include: { attributes: { include: { attribute: true } } },
    });
    expect(withAttributes.attributes.map((a) => a.attribute.code)).toEqual(['caliber']);

    const error = await prisma.attribute.delete({ where: { id: caliber.id } }).catch((e) => e);
    expect(prismaCode(error)).toBe('P2003');
  });

  it('deletes variant-level values together with the variant', async () => {
    const caliber = await createSelect('caliber', ['12']);
    const variant = product.variants[0]!;
    await prisma.productAttributeValue.create({
      data: {
        productId: product.id,
        variantId: variant.id,
        attributeId: caliber.id,
        valueId: caliber.values[0]!.id,
      },
    });

    await prisma.productVariant.delete({ where: { id: variant.id } });
    expect(await prisma.productAttributeValue.count()).toBe(0);
  });
});
