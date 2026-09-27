/* eslint-disable no-console -- CLI script output */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Writes docs/database/erd.md: a Mermaid ER diagram read from the live schema (information_schema),
 * so it also shows hand-written SQL (generated columns) exactly as deployed.
 * Run after migrations: `npm run db:erd`.
 */

const rootEnv = resolve(__dirname, '../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const OUTPUT = resolve(__dirname, '../../../docs/database/erd.md');

// Domain groups keep the diagrams readable (one diagram per group + a full relation map).
const GROUPS: Record<string, string[]> = {
  'Каталог: категорії, бренди, товари': [
    'categories',
    'category_translations',
    'brands',
    'brand_translations',
    'products',
    'product_translations',
    'product_categories',
    'product_variants',
  ],
  Атрибути: [
    'attributes',
    'attribute_translations',
    'attribute_values',
    'attribute_value_translations',
    'category_attributes',
    'product_attribute_values',
  ],
  'Ціни, склад, медіа': [
    'price_types',
    'prices',
    'warehouses',
    'inventory',
    'media',
    'media_translations',
    'product_media',
  ],
  'SEO, редиректи, інтеграції, службові': [
    'locales',
    'seo_metadata',
    'redirects',
    'integration_mappings',
    'sync_logs',
    'settings',
  ],
};

interface Column {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
  generated: boolean;
}
interface Key {
  table: string;
  column: string;
  kind: 'PK' | 'FK' | 'UK';
}
interface Relation {
  from: string;
  to: string;
  column: string;
  nullable: boolean;
}

async function main() {
  const columns = await prisma.$queryRaw<Column[]>`
    SELECT c.table_name AS "table", c.column_name AS "column",
           CASE WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name ELSE c.data_type END AS "type",
           c.is_nullable = 'YES' AS "nullable", c.is_generated = 'ALWAYS' AS "generated"
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name <> '_prisma_migrations'
    ORDER BY c.table_name, c.ordinal_position`;
  const keys = await prisma.$queryRaw<Key[]>`
    SELECT kcu.table_name AS "table", kcu.column_name AS "column",
           CASE tc.constraint_type WHEN 'PRIMARY KEY' THEN 'PK' WHEN 'FOREIGN KEY' THEN 'FK' ELSE 'UK' END AS "kind"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')`;
  const relations = await prisma.$queryRaw<Relation[]>`
    SELECT kcu.table_name AS "from", ccu.table_name AS "to", kcu.column_name AS "column",
           c.is_nullable = 'YES' AS "nullable"
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.columns c
      ON c.table_schema = 'public' AND c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY 1, 3`;

  const keyMap = new Map<string, Set<string>>();
  for (const k of keys) {
    const id = `${k.table}.${k.column}`;
    keyMap.set(id, (keyMap.get(id) ?? new Set()).add(k.kind));
  }
  const byTable = new Map<string, Column[]>();
  for (const c of columns) byTable.set(c.table, [...(byTable.get(c.table) ?? []), c]);

  const entity = (table: string) => {
    const lines = (byTable.get(table) ?? []).map((c) => {
      const markers = [...(keyMap.get(`${c.table}.${c.column}`) ?? [])].sort().join(', ');
      const type = c.type.replace(/\s+/g, '_');
      const note = c.generated ? ' "generated"' : c.nullable ? ' "nullable"' : '';
      return `    ${type} ${c.column}${markers ? ` ${markers}` : ''}${note}`;
    });
    return `  ${table} {\n${lines.join('\n')}\n  }`;
  };
  const edge = (r: Relation) =>
    `  ${r.to} ${r.nullable ? '|o' : '||'}--o{ ${r.from} : "${r.column}"`;

  const grouped = new Set(Object.values(GROUPS).flat());
  const missing = [...byTable.keys()].filter((t) => !grouped.has(t));
  if (missing.length)
    throw new Error(`Add tables to a group in prisma/erd.ts: ${missing.join(', ')}`);

  const sections = Object.entries(GROUPS).map(([title, tables]) => {
    const inGroup = new Set(tables);
    const edges = relations.filter((r) => inGroup.has(r.from) && inGroup.has(r.to)).map(edge);
    return `## ${title}\n\n\`\`\`mermaid\nerDiagram\n${[...edges, ...tables.map(entity)].join('\n')}\n\`\`\``;
  });
  const overview = `## Звʼязки між усіма таблицями\n\n\`\`\`mermaid\nerDiagram\n${relations.map(edge).join('\n')}\n\`\`\``;

  const doc = [
    '# ERD — схема бази даних',
    '',
    '> Згенеровано з живої схеми PostgreSQL командою `npm run db:erd` — не редагувати вручну.',
    '> Джерело правди — `apps/api/prisma/schema.prisma` і міграції. PK/FK/UK — ключі; `generated` — обчислювана колонка.',
    '',
    overview,
    '',
    ...sections.flatMap((s) => [s, '']),
  ].join('\n');

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, doc);
  console.log(`ERD: ${byTable.size} tables, ${relations.length} relations → ${OUTPUT}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
