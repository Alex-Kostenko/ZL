import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const prismaCode = (e: unknown) => (e as Prisma.PrismaClientKnownRequestError).code;

describe('Catalog schema: locales, category tree, brands (§5, §9, §59)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app?.close();
  });

  const createCategory = (slug: string, path: string, parentId?: string) =>
    prisma.category.create({
      data: {
        slug,
        path,
        parentId,
        depth: path.split('/').length - 1,
        translations: {
          create: [
            { locale: 'uk', name: `uk ${slug}` },
            { locale: 'en', name: `en ${slug}` },
          ],
        },
      },
    });

  it('has uk, ru, en with uk as the only default locale', async () => {
    const locales = await prisma.locale.findMany({ orderBy: { position: 'asc' } });
    expect(locales.map((l) => l.code)).toEqual(['uk', 'ru', 'en']);
    expect(locales.filter((l) => l.isDefault).map((l) => l.code)).toEqual(['uk']);
  });

  it('resolves a category by path with its translation and ancestors', async () => {
    const root = await createCategory('zbroia', 'zbroia');
    const child = await createCategory('rushnytsi', 'zbroia/rushnytsi', root.id);

    const found = await prisma.category.findUniqueOrThrow({
      where: { path: 'zbroia/rushnytsi' },
      include: { translations: { where: { locale: 'uk' } }, parent: true },
    });

    expect(found.id).toBe(child.id);
    expect(found.depth).toBe(1);
    expect(found.translations[0]?.name).toBe('uk rushnytsi');
    expect(found.parent?.slug).toBe('zbroia');
  });

  it('allows the same slug under different parents but not the same path', async () => {
    const a = await createCategory('zbroia', 'zbroia');
    const b = await createCategory('optyka', 'optyka');
    await createCategory('chokhly', 'zbroia/chokhly', a.id);
    await expect(createCategory('chokhly', 'optyka/chokhly', b.id)).resolves.toBeTruthy();

    const duplicate = await createCategory('chokhly', 'zbroia/chokhly', a.id).catch((e) => e);
    expect(prismaCode(duplicate)).toBe('P2002');
  });

  it('rejects a translation in an unknown locale', async () => {
    const error = await prisma.category
      .create({
        data: { slug: 'x', path: 'x', translations: { create: { locale: 'de', name: 'X' } } },
      })
      .catch((e) => e);
    expect(prismaCode(error)).toBe('P2003');
  });

  it('refuses to delete a category that has children, cascades its translations', async () => {
    const root = await createCategory('zbroia', 'zbroia');
    const child = await createCategory('rushnytsi', 'zbroia/rushnytsi', root.id);

    const error = await prisma.category.delete({ where: { id: root.id } }).catch((e) => e);
    expect(prismaCode(error)).toBe('P2003');

    await prisma.category.delete({ where: { id: child.id } });
    expect(await prisma.categoryTranslation.count({ where: { categoryId: child.id } })).toBe(0);
  });

  it('stores brands with a unique slug and localized descriptions', async () => {
    await prisma.brand.create({
      data: {
        name: 'Swarovski Optik',
        slug: 'swarovski-optik',
        country: 'AT',
        translations: { create: [{ locale: 'uk', description: 'Австрійська оптика' }] },
      },
    });

    const brand = await prisma.brand.findUniqueOrThrow({
      where: { slug: 'swarovski-optik' },
      include: { translations: true },
    });
    expect(brand.translations).toHaveLength(1);

    const duplicate = await prisma.brand
      .create({ data: { name: 'Other', slug: 'swarovski-optik' } })
      .catch((e) => e);
    expect(prismaCode(duplicate)).toBe('P2002');
  });
});
