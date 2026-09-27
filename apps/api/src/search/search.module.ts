import type { ApiEnv } from '@ml/config';
import { Module } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { CategoriesModule } from '../catalog/categories/categories.module';
import { InventoryModule } from '../catalog/inventory/inventory.module';
import { PricingModule } from '../catalog/pricing/pricing.module';
import { API_ENV } from '../config/config.module';
import { ProductDocumentsService } from './product-documents.service';
import { MEILI, ProductIndexService } from './product-index.service';

/**
 * Search (§12): Meilisearch product indexes and the documents they hold.
 * The client is lazy (plain HTTP per call), so the API starts even when Meilisearch is down.
 */
@Module({
  imports: [CategoriesModule, PricingModule, InventoryModule],
  providers: [
    {
      provide: MEILI,
      inject: [API_ENV],
      // The master key stays server-side; storefront never talks to Meilisearch directly.
      useFactory: (env: ApiEnv) =>
        new Meilisearch({ host: env.MEILI_HOST, apiKey: env.MEILI_MASTER_KEY, timeout: 10_000 }),
    },
    ProductIndexService,
    ProductDocumentsService,
  ],
  exports: [MEILI, ProductIndexService, ProductDocumentsService],
})
export class SearchModule {}
