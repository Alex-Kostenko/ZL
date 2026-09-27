import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';

/** Full application (real Postgres/Redis from the test env) with production routing. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}

/** Tables filled by migrations (reference data) that tests must never wipe. */
const PRESERVED_TABLES = new Set(['_prisma_migrations', 'locales', 'price_types']);

/** Empties every application table (keeps migration history and reference data). Call in `beforeEach`. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const tables = rows.map((r) => r.tablename).filter((t) => !PRESERVED_TABLES.has(t));
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t}"`).join(', ');
  // No CASCADE: it would also empty preserved tables referenced by FKs.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY`);
}
