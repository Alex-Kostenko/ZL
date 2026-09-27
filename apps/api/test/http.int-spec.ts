import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './utils/test-app';

describe('HTTP: routing, health, errors (API + PostgreSQL + Redis + Meilisearch)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves /api/v1 and returns a requestId header', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(res.body).toEqual({ name: 'myslyvska-lavka-api', status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('keeps an upstream X-Request-Id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', 'web-test-123456')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('web-test-123456');
  });

  it('GET /health is up without dependency checks', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('GET /health/ready reports every dependency as up', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
    for (const name of ['database', 'redis', 'search']) {
      expect(res.body.checks[name]).toMatchObject({ status: 'up' });
    }
  });

  it('renders unknown routes in the unified error format with the same requestId', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/nope',
      requestId: res.headers['x-request-id'],
    });
  });

  it('answers malformed JSON with 400 BAD_REQUEST and a requestId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('does not expose Swagger or Bull Board through the Nest app itself', async () => {
    // Both are mounted only by main.ts in development.
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/queues').expect(404);
  });
});
