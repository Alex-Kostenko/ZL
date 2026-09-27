import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase } from './utils/test-app';

describe('PrismaService (API + PostgreSQL)', () => {
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

  it('is connected to the test database, never the dev one', async () => {
    const [row] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(row?.db).toMatch(/_test$/);
  });

  it('writes and reads JSON values', async () => {
    await prisma.setting.create({ data: { key: 'contacts', value: { phone: '+380' } } });
    const setting = await prisma.setting.findUniqueOrThrow({ where: { key: 'contacts' } });
    expect(setting.value).toEqual({ phone: '+380' });
  });

  it('starts every test from an empty database', async () => {
    expect(await prisma.setting.count()).toBe(0);
  });

  it('raises P2002 on a unique violation (mapped to 409 by the error filter)', async () => {
    await prisma.setting.create({ data: { key: 'dup', value: 1 } });
    const error = await prisma.setting
      .create({ data: { key: 'dup', value: 2 } })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
  });
});
