import 'reflect-metadata';
import { loadApiEnv } from '@ml/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { SWAGGER_PATH, setupSwagger } from './openapi/swagger';

async function bootstrap(): Promise<void> {
  // Fails fast on missing/invalid env, before any module initializes.
  const env = loadApiEnv();

  // Buffer bootstrap logs until pino is ready, so every line is structured.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  configureApp(app);

  const swaggerEnabled = env.NODE_ENV !== 'production';
  if (swaggerEnabled) setupSwagger(app);

  await app.listen(env.API_PORT);
  Logger.log(`API listening on http://localhost:${env.API_PORT}/api/v1`, 'Bootstrap');
  if (swaggerEnabled) {
    Logger.log(`Swagger UI: http://localhost:${env.API_PORT}/${SWAGGER_PATH}`, 'Bootstrap');
  }
}

void bootstrap();
