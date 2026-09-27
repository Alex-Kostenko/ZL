import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ALL_QUEUES } from './queues';

export const BULL_BOARD_PATH = '/api/queues';

/**
 * Bull Board UI for all queues. Dev only, no auth: never call in production (rule 12).
 * Production queue monitoring goes through /admin with RBAC (step 11.3).
 */
export function setupBullBoard(app: INestApplication): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_PATH);
  createBullBoard({
    queues: ALL_QUEUES.map((name) => new BullMQAdapter(app.get<Queue>(getQueueToken(name)))),
    serverAdapter,
  });
  app.use(BULL_BOARD_PATH, serverAdapter.getRouter());
}
