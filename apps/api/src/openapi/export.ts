import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { createOpenApiDocument } from './swagger';

/**
 * Writes the OpenAPI spec to packages/api-client/openapi.json (`npm run api:generate`).
 * Preview mode builds the module graph without instantiating providers, so no DB/Redis is needed.
 * Must run from `nest build` output: the Swagger CLI plugin fills DTO schemas at compile time.
 */
async function exportSpec(): Promise<void> {
  const app = await NestFactory.create(AppModule, { preview: true, logger: ['error'] });
  configureApp(app);
  const document = createOpenApiDocument(app);
  await app.close();

  const target = resolve(__dirname, '../../../../packages/api-client/openapi.json');
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`OpenAPI spec written to ${target}`);
}

void exportSpec();
