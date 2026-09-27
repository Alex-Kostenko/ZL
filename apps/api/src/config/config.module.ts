import { loadApiEnv } from '@ml/config';
import { Global, Module } from '@nestjs/common';

/** DI token for the validated, frozen API env. Inject as `@Inject(API_ENV) env: ApiEnv`. */
export const API_ENV = Symbol('API_ENV');

@Global()
@Module({
  providers: [{ provide: API_ENV, useFactory: loadApiEnv }],
  exports: [API_ENV],
})
export class ConfigModule {}
