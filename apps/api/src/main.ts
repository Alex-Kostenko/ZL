import 'reflect-metadata';
import { loadApiEnv } from '@ml/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Fails fast on missing/invalid env, before any module initializes.
  const env = loadApiEnv();

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  Logger.log(`API listening on http://localhost:${env.API_PORT}`, 'Bootstrap');
}

void bootstrap();
