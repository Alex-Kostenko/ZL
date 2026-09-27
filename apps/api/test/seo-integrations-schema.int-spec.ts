import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

const prismaCode = (e: unknown) => (e as Prisma.PrismaClientKnownRequestError).code;
const isCheckViolation = (e: unknown) =>
  /_chk|check constraint/i.test(String((e as Error).message));

describe('Schema: SEO metadata, redirects, integration mappings, sync logs', () => {
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

  describe('seo_metadata', () => {
    it('stores one record per entity and locale, including static routes', async () => {
      const product = await prisma.product.create({ data: { sku: 'P1', slug: 'p1' } });
      await prisma.seoMetadata.createMany({
        data: [
          { entityType: 'PRODUCT', entityId: product.id, locale: 'uk', title: 'Купити ніж' },
          { entityType: 'PRODUCT', entityId: product.id, locale: 'en', title: 'Buy a knife' },
          { entityType: 'ROUTE', entityId: '/sale', locale: 'uk', noindex: false },
        ],
      });

      const uk = await prisma.seoMetadata.findUniqueOrThrow({
        where: {
          entityType_entityId_locale: { entityType: 'PRODUCT', entityId: product.id, locale: 'uk' },
        },
      });
      expect(uk.title).toBe('Купити ніж');

      const duplicate = await prisma.seoMetadata
        .create({ data: { entityType: 'PRODUCT', entityId: product.id, locale: 'uk' } })
        .catch((e) => e);
      expect(prismaCode(duplicate)).toBe('P2002');
    });
  });

  describe('redirects', () => {
    it('stores 301/302 with a target and 410 without one', async () => {
      await prisma.redirect.createMany({
        data: [
          { fromPath: '/product/old', toPath: '/product/new', source: 'SLUG_CHANGE' },
          { fromPath: '/promo', toPath: '/sale', statusCode: 302 },
          { fromPath: '/product/discontinued', statusCode: 410 },
        ],
      });
      const hit = await prisma.redirect.update({
        where: { fromPath: '/product/old' },
        data: { hits: { increment: 1 }, lastHitAt: new Date() },
      });
      expect(hit).toMatchObject({ statusCode: 301, toPath: '/product/new', hits: 1 });
    });

    it('rejects invalid codes, missing targets, 410 with a target and self-redirects', async () => {
      for (const data of [
        { fromPath: '/a', toPath: '/b', statusCode: 307 },
        { fromPath: '/a', statusCode: 301 },
        { fromPath: '/a', toPath: '/b', statusCode: 410 },
        { fromPath: '/a', toPath: '/a' },
      ]) {
        expect(isCheckViolation(await prisma.redirect.create({ data }).catch((e) => e))).toBe(true);
      }
    });

    it('allows only one redirect per source path', async () => {
      await prisma.redirect.create({ data: { fromPath: '/x', toPath: '/y' } });
      const duplicate = await prisma.redirect
        .create({ data: { fromPath: '/x', toPath: '/z' } })
        .catch((e) => e);
      expect(prismaCode(duplicate)).toBe('P2002');
    });
  });

  describe('integration_mappings', () => {
    it('maps an external id once per integration and entity type (idempotent upsert)', async () => {
      const product = await prisma.product.create({ data: { sku: 'P1', slug: 'p1' } });
      const key = { integration: 'tria', entityType: 'PRODUCT' as const, externalId: 'T-100' };

      for (const hash of ['aaa', 'bbb']) {
        await prisma.integrationMapping.upsert({
          where: { integration_entityType_externalId: key },
          create: { ...key, internalId: product.id, payloadHash: hash, lastSyncedAt: new Date() },
          update: { payloadHash: hash, lastSyncedAt: new Date() },
        });
      }

      const mappings = await prisma.integrationMapping.findMany();
      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toMatchObject({ internalId: product.id, payloadHash: 'bbb' });

      // The same external id may exist for another entity type.
      await expect(
        prisma.integrationMapping.create({
          data: { ...key, entityType: 'VARIANT', internalId: product.id },
        }),
      ).resolves.toBeTruthy();
    });
  });

  describe('sync_logs', () => {
    it('records a run from RUNNING to PARTIAL with counters and an error sample', async () => {
      const run = await prisma.syncLog.create({
        data: {
          integration: 'tria',
          scope: 'prices',
          trigger: 'SCHEDULED',
          jobId: 'tria-prices-1',
        },
      });
      expect(run.status).toBe('RUNNING');

      await prisma.syncLog.update({
        where: { id: run.id },
        data: {
          status: 'PARTIAL',
          finishedAt: new Date(),
          itemsTotal: 3,
          itemsUpdated: 2,
          itemsFailed: 1,
          errors: [{ externalId: 'T-7', message: 'Negative price' }],
        },
      });

      const latest = await prisma.syncLog.findFirstOrThrow({
        where: { integration: 'tria', scope: 'prices' },
        orderBy: { startedAt: 'desc' },
      });
      expect(latest).toMatchObject({ status: 'PARTIAL', itemsFailed: 1 });
      expect(latest.errors).toEqual([{ externalId: 'T-7', message: 'Negative price' }]);
    });
  });
});
