import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/** Builds the OpenAPI document; also the source for the generated `@ml/api-client` (step 4.7). */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Мисливська лавка API')
    .setDescription('REST API `/api/v1`: storefront, admin, integrations.')
    .setVersion('1.0')
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}

/**
 * Swagger UI at `/api/docs`, JSON at `/api/docs-json`.
 * Never call in production: the routes must not exist there at all (rule 12, §57).
 */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  });
}
