import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsModule } from './common/errors/errors.module';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [ConfigModule, LoggingModule, ErrorsModule, PrismaModule, RedisModule, HealthModule],
  controllers: [AppController],
})
export class AppModule {}
