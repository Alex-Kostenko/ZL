import 'reflect-metadata';
import { loadApiEnv } from '@ml/config';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SWAGGER_PATH, setupSwagger } from './openapi/swagger';

async function bootstrap(): Promise<void> {
  // Fails fast on missing/invalid env, before any module initializes.
  const env = loadApiEnv();

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // All routes live under /api/v{N}; version 1 is the default.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const swaggerEnabled = env.NODE_ENV !== 'production';
  if (swaggerEnabled) setupSwagger(app);

  await app.listen(env.API_PORT);
  Logger.log(`API listening on http://localhost:${env.API_PORT}/api/v1`, 'Bootstrap');
  if (swaggerEnabled) {
    Logger.log(`Swagger UI: http://localhost:${env.API_PORT}/${SWAGGER_PATH}`, 'Bootstrap');
  }
}

void bootstrap();
