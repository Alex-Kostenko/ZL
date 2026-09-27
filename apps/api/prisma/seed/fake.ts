/* eslint-disable no-console -- CLI script output */
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fakerEN, fakerUK } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { slugify } from '../../src/common/text/slugify';
import { Prisma, PrismaClient } from '../../src/generated/prisma/client';

/**
 * Fake catalog for development and performance testing (step 5.7): 50k products, 500 brands,
 * variants, prices, stock, attribute values. Deterministic (fixed faker seed), so benchmarks are
 * comparable between runs. Requires the reference seed (categories, attributes, warehouses).
 * Run: `npm run db:seed:fake` (part of `npm run db:reset`). Size: FAKE_PRODUCTS=5000.
 */

const rootEnv = resolve(__dirname, '../../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
if (process.env.NODE_ENV === 'production')
  throw new Error('Fake data is never seeded in production');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const PRODUCTS = Number(process.env.FAKE_PRODUCTS ?? 50_000);
const BRANDS = 500;
const CHUNK = 5_000; // products generated and inserted per round
const BATCH = 2_000; // rows per INSERT (stays far below PostgreSQL's 65 535 bind parameters)

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
fakerUK.seed(42);
fakerEN.seed(42);
const f = fakerUK;

/** UUID v7 (time-ordered, like the DB default), generated client-side to link rows before insert. */
function uuidv7(): string {
  const bytes = randomBytes(16);
  const ts = BigInt(Date.now());
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function insert<T>(rows: T[], write: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) await write(rows.slice(i, i + BATCH));
}

const chance = (p: number) => f.number.float({ min: 0, max: 1 }) < p;
const money = (n: number) => new Prisma.Decimal(n.toFixed(2));

// Price bands by root category (UAH).
const PRICE_BANDS: Record<string, [number, number]> = {
  zbroia: [300, 120_000],
  optyka: [800, 180_000],
  'nozhi-ta-likhtari': [150, 20_000],
};

const NUMBER_RANGES: Record<string, [number, number]> = {
  barrel_length: [300, 760],
  objective_diameter: [20, 56],
  detection_range: [300, 3000],
  blade_length: [50, 250],
  luminous_flux: [100, 5000],
};
const MAGNIFICATIONS: [number, number][] = [
  [1, 4],
  [1, 6],
  [2, 7],
  [3, 9],
  [3, 12],
  [4, 16],
  [5, 25],
  [6, 24],
  [8, 8],
  [10, 10],
];
const COUNTRIES = [
  'UA',
  'US',
  'DE',
  'AT',
  'IT',
  'CZ',
  'JP',
  'CN',
  'TR',
  'FI',
  'SE',
  'BE',
  'GB',
  'FR',
  'ES',
];

type AttributeInfo = Prisma.AttributeGetPayload<{ include: { values: true } }>;

async function loadReference() {
  const categories = await prisma.category.findMany({
    include: { translations: { where: { locale: 'uk' } }, attributes: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));
  const attributes = new Map(
    (
      await prisma.attribute.findMany({ include: { values: { orderBy: { position: 'asc' } } } })
    ).map((a) => [a.id, a]),
  );

  // Leaves with their effective attributes (own + inherited from ancestors).
  const leaves = categories
    .filter((c) => !categories.some((child) => child.parentId === c.id))
    .map((leaf) => {
      const attrIds = new Set<string>();
      for (
        let node: typeof leaf | undefined = leaf;
        node;
        node = node.parentId ? byId.get(node.parentId) : undefined
      ) {
        node.attributes.forEach((a) => attrIds.add(a.attributeId));
      }
      return {
        id: leaf.id,
        name: leaf.translations[0]?.name ?? leaf.slug,
        root: leaf.path.split('/')[0]!,
        attributes: [...attrIds].map((id) => attributes.get(id)!),
      };
    });

  const warehouses = await prisma.warehouse.findMany();
  const retail = await prisma.priceType.findUniqueOrThrow({ where: { code: 'retail' } });
  if (leaves.length === 0 || warehouses.length === 0) {
    throw new Error('Reference data missing: run `npm run db:seed` first');
  }
  return { leaves, warehouses, retailId: retail.id };
}

async function createBrands(): Promise<{ id: string; name: string }[]> {
  const brands = new Map<string, { id: string; name: string; slug: string; country: string }>();
  while (brands.size < BRANDS) {
    const name = `${fakerEN.word.adjective()} ${fakerEN.word.noun()}`.replace(/\b\w/g, (c) =>
      c.toUpperCase(),
    );
    const slug = slugify(name);
    if (!brands.has(slug)) {
      brands.set(slug, { id: uuidv7(), name, slug, country: f.helpers.arrayElement(COUNTRIES) });
    }
  }
  const rows = [...brands.values()];
  await insert(rows, (data) => prisma.brand.createMany({ data }));
  return rows;
}

function attributeValue(
  attribute: AttributeInfo,
  base: { productId: string; variantId?: string },
  i: number,
) {
  const fromTria = chance(0.2);
  const row: Prisma.ProductAttributeValueCreateManyInput = {
    id: uuidv7(),
    ...base,
    attributeId: attribute.id,
    source: fromTria ? 'TRIA' : 'MANUAL',
    sourceExternalId: fromTria ? `TRIA-A${i}` : null,
    sourceUpdatedAt: fromTria ? f.date.recent({ days: 30 }) : null,
  };
  switch (attribute.type) {
    case 'NUMBER': {
      const [min, max] = NUMBER_RANGES[attribute.code] ?? [1, 100];
      return [{ ...row, valueNumber: f.number.int({ min, max }) }];
    }
    case 'RANGE': {
      const [from, to] = f.helpers.arrayElement(MAGNIFICATIONS);
      return [{ ...row, valueNumber: from, valueNumberTo: to }];
    }
    case 'BOOLEAN':
      return [{ ...row, valueBoolean: chance(0.5) }];
    case 'SELECT':
      return [{ ...row, valueId: f.helpers.arrayElement(attribute.values).id }];
    case 'MULTI_SELECT':
      return f.helpers
        .arrayElements(attribute.values, { min: 1, max: 2 })
        .map((v) => ({ ...row, id: uuidv7(), valueId: v.id }));
    default:
      return [];
  }
}

async function main() {
  const started = performance.now();
  if ((await prisma.product.count()) > 0) {
    console.log(
      'Products already exist: fake data skipped (run `npm run db:reset` for a fresh DB)',
    );
    return;
  }

  const { leaves, warehouses, retailId } = await loadReference();
  const brands = await createBrands();
  const totals = { variants: 0, prices: 0, inventory: 0, attributeValues: 0 };

  for (let offset = 0; offset < PRODUCTS; offset += CHUNK) {
    const products: Prisma.ProductCreateManyInput[] = [];
    const translations: Prisma.ProductTranslationCreateManyInput[] = [];
    const links: Prisma.ProductCategoryCreateManyInput[] = [];
    const variants: Prisma.ProductVariantCreateManyInput[] = [];
    const prices: Prisma.PriceCreateManyInput[] = [];
    const inventory: Prisma.InventoryCreateManyInput[] = [];
    const values: Prisma.ProductAttributeValueCreateManyInput[] = [];

    for (let i = offset; i < Math.min(offset + CHUNK, PRODUCTS); i++) {
      const leaf = f.helpers.arrayElement(leaves);
      const brand = f.helpers.arrayElement(brands);
      const model = `${f.string.alpha({ length: { min: 1, max: 2 }, casing: 'upper' })}-${f.number.int({ min: 10, max: 999 })}`;
      const productId = uuidv7();
      const sku = `ML-${String(i + 1).padStart(6, '0')}`;
      const active = chance(0.95);
      const createdAt = f.date.past({ years: 2 });
      const isSale = chance(0.1);

      products.push({
        id: productId,
        sku,
        slug: `${slugify(`${brand.name} ${model}`)}-${i + 1}`,
        brandId: brand.id,
        primaryCategoryId: leaf.id,
        status: active ? 'ACTIVE' : 'DRAFT',
        isPublished: active && chance(0.97),
        publishedAt: active ? createdAt : null,
        isSale,
        isAntidron: chance(0.03),
        externalId: `TRIA-P${i + 1}`,
        createdAt,
        updatedAt: f.date.between({ from: createdAt, to: new Date() }),
      });

      const title = `${leaf.name} ${brand.name} ${model}`;
      translations.push({
        productId,
        locale: 'uk',
        title,
        shortDescription: `${title} — ${f.helpers.arrayElement(['надійний вибір для полювання', 'перевірена якість', 'для щоденного використання', 'професійний рівень', 'оптимальне співвідношення ціни та якості'])}.`,
        description: `${title}. ${f.lorem.paragraph({ min: 2, max: 4 })}`,
      });

      links.push({ productId, categoryId: leaf.id, position: i });
      if (chance(0.15)) {
        const extra = f.helpers.arrayElement(leaves);
        if (extra.id !== leaf.id) links.push({ productId, categoryId: extra.id, position: i });
      }

      const variantAxis = leaf.attributes.find((a) => a.isVariantOption && a.values.length > 1);
      const variantCount = variantAxis
        ? f.helpers.weightedArrayElement([
            { weight: 6, value: 1 },
            { weight: 3, value: 2 },
            { weight: 1, value: 3 },
          ])
        : 1;
      const axisValues = variantAxis
        ? f.helpers.arrayElements(variantAxis.values, variantCount)
        : [];
      const [minPrice, maxPrice] = PRICE_BANDS[leaf.root] ?? [100, 10_000];
      const basePrice = f.number.int({ min: minPrice, max: maxPrice });

      for (let v = 0; v < variantCount; v++) {
        const variantId = uuidv7();
        variants.push({
          id: variantId,
          productId,
          sku: `${sku}-${v + 1}`,
          barcode: f.string.numeric(13),
          weightG: f.number.int({ min: 50, max: 5000 }),
          position: v,
          externalId: `TRIA-V${i + 1}-${v + 1}`,
          createdAt,
          updatedAt: createdAt,
        });

        const price = Math.round(basePrice * (1 + v * 0.05));
        prices.push({
          id: uuidv7(),
          variantId,
          priceTypeId: retailId,
          price: money(price),
          salePrice: isSale ? money(price * f.number.float({ min: 0.7, max: 0.95 })) : null,
          updatedAt: createdAt,
        });

        for (const warehouse of warehouses) {
          const quantity = chance(0.25) ? 0 : f.number.int({ min: 1, max: 40 });
          const reserved =
            quantity > 0 && chance(0.1) ? f.number.int({ min: 1, max: Math.min(2, quantity) }) : 0;
          inventory.push({
            variantId,
            warehouseId: warehouse.id,
            quantity,
            reserved,
            updatedAt: createdAt,
          });
        }

        const axisValue = axisValues[v];
        if (variantAxis && axisValue) {
          values.push({
            id: uuidv7(),
            productId,
            variantId,
            attributeId: variantAxis.id,
            valueId: axisValue.id,
          });
        }
      }

      for (const attribute of leaf.attributes) {
        if (attribute.id === variantAxis?.id || !chance(0.85)) continue;
        values.push(...attributeValue(attribute, { productId }, i));
      }
    }

    await insert(products, (data) => prisma.product.createMany({ data }));
    await insert(translations, (data) => prisma.productTranslation.createMany({ data }));
    await insert(links, (data) => prisma.productCategory.createMany({ data }));
    await insert(variants, (data) => prisma.productVariant.createMany({ data }));
    await insert(prices, (data) => prisma.price.createMany({ data }));
    await insert(inventory, (data) => prisma.inventory.createMany({ data }));
    await insert(values, (data) => prisma.productAttributeValue.createMany({ data }));

    totals.variants += variants.length;
    totals.prices += prices.length;
    totals.inventory += inventory.length;
    totals.attributeValues += values.length;
    const done = Math.min(offset + CHUNK, PRODUCTS);
    console.log(`  ${done.toLocaleString('en')} / ${PRODUCTS.toLocaleString('en')} products`);
  }

  // Fresh planner statistics, so performance tests see realistic query plans.
  await prisma.$executeRawUnsafe('ANALYZE');

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `Fake data: ${PRODUCTS} products, ${brands.length} brands, ${totals.variants} variants, ` +
      `${totals.prices} prices, ${totals.inventory} stock rows, ${totals.attributeValues} attribute values in ${seconds}s`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
