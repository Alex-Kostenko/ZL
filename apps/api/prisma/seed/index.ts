/* eslint-disable no-console -- CLI script output */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { slugify } from '../../src/common/text/slugify';
import { PrismaClient } from '../../src/generated/prisma/client';
import { ATTRIBUTES } from './data/attributes';
import { CATEGORY_TREE, type CategorySeed } from './data/categories';
import { WAREHOUSES } from './data/warehouses';

/**
 * Reference catalog data: category tree, warehouses, base attributes (step 5.6).
 * Idempotent: every write is an upsert by a natural key, so it is safe to re-run.
 * Run: `npm run db:seed` (also part of `npm run db:reset`).
 */

const rootEnv = resolve(__dirname, '../../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const LOCALES = ['uk', 'ru', 'en'] as const;

/** Path of a category by its uk names from the root, e.g. ['Оптика', 'Приціли'] → `optyka/prytsily`. */
const pathOf = (names: string[]) => names.map((n) => slugify(n)).join('/');

async function seedCategories(
  nodes: CategorySeed[],
  parent?: { id: string; path: string; depth: number },
) {
  let count = 0;
  for (const [position, node] of nodes.entries()) {
    const slug = slugify(node.name);
    const path = parent ? `${parent.path}/${slug}` : slug;
    const depth = parent ? parent.depth + 1 : 0;
    const category = await prisma.category.upsert({
      where: { path },
      create: { slug, path, depth, position, parentId: parent?.id },
      update: { position, parentId: parent?.id ?? null, depth },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: category.id, locale: 'uk' } },
      create: { categoryId: category.id, locale: 'uk', name: node.name },
      update: { name: node.name },
    });
    count += 1 + (await seedCategories(node.children ?? [], { id: category.id, path, depth }));
  }
  return count;
}

async function seedWarehouses() {
  for (const w of WAREHOUSES) {
    await prisma.warehouse.upsert({ where: { code: w.code }, create: w, update: w });
  }
  return WAREHOUSES.length;
}

async function seedAttributes() {
  let links = 0;
  for (const [position, a] of ATTRIBUTES.entries()) {
    const flags = {
      type: a.type,
      isFilterable: a.isFilterable ?? false,
      isSearchable: a.isSearchable ?? false,
      isVariantOption: a.isVariantOption ?? false,
      position,
    };
    const attribute = await prisma.attribute.upsert({
      where: { code: a.code },
      create: { code: a.code, ...flags },
      update: flags,
    });

    for (const locale of LOCALES) {
      const data = { name: a.name[locale], unit: a.unit?.[locale] ?? null };
      await prisma.attributeTranslation.upsert({
        where: { attributeId_locale: { attributeId: attribute.id, locale } },
        create: { attributeId: attribute.id, locale, ...data },
        update: data,
      });
    }

    for (const [optionPosition, option] of (a.options ?? []).entries()) {
      const value = await prisma.attributeValue.upsert({
        where: { attributeId_code: { attributeId: attribute.id, code: option.code } },
        create: { attributeId: attribute.id, code: option.code, position: optionPosition },
        update: { position: optionPosition },
      });
      for (const locale of LOCALES) {
        await prisma.attributeValueTranslation.upsert({
          where: { attributeValueId_locale: { attributeValueId: value.id, locale } },
          create: { attributeValueId: value.id, locale, label: option.label[locale] },
          update: { label: option.label[locale] },
        });
      }
    }

    for (const names of a.categories) {
      const category = await prisma.category.findUnique({ where: { path: pathOf(names) } });
      if (!category) throw new Error(`Attribute ${a.code}: unknown category ${names.join(' › ')}`);
      await prisma.categoryAttribute.upsert({
        where: { categoryId_attributeId: { categoryId: category.id, attributeId: attribute.id } },
        create: { categoryId: category.id, attributeId: attribute.id, position },
        update: { position },
      });
      links += 1;
    }
  }
  return { attributes: ATTRIBUTES.length, links };
}

async function main() {
  const started = performance.now();
  const categories = await seedCategories(CATEGORY_TREE);
  const warehouses = await seedWarehouses();
  const { attributes, links } = await seedAttributes();
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `Seeded: ${categories} categories, ${warehouses} warehouses, ${attributes} attributes ` +
      `(${links} category links) in ${seconds}s`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
