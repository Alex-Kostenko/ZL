import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, getSchemaPath, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/errors';

export const SWAGGER_PATH = 'api/docs';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'] as const;

/** Builds the OpenAPI document; also the source for the generated `@ml/api-client` (step 4.7). */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Мисливська лавка API')
    .setDescription('REST API `/api/v1`: storefront, admin, integrations.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto],
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
  addDefaultErrorResponse(document);
  return document;
}

/** Every operation may fail with ErrorResponseDto; typed errors in the generated client. */
function addDefaultErrorResponse(document: OpenAPIObject): void {
  const errorResponse = {
    description: 'Error (unified format, see `code`)',
    content: {
      'application/json': { schema: { $ref: getSchemaPath(ErrorResponseDto) } },
    },
  };
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) operation.responses.default ??= errorResponse;
    }
  }
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
