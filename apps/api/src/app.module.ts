import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CacheModule } from './cache/cache.module';
import { BrandsModule } from './catalog/brands/brands.module';
import { CategoriesModule } from './catalog/categories/categories.module';
import { ProductsModule } from './catalog/products/products.module';
import { ErrorsModule } from './common/errors/errors.module';
import { HealthModule } from './health/health.module';
import { I18nModule } from './i18n/i18n.module';
import { JobsModule } from './jobs/jobs.module';
import { ConfigModule } from './config/config.module';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    ErrorsModule,
    PrismaModule,
    RedisModule,
    CacheModule,
    I18nModule,
    JobsModule,
    HealthModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    SearchModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
