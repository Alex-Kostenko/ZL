import { INestApplication, RequestMethod, VersioningType } from '@nestjs/common';

/** HTTP routing shared by main.ts and e2e tests, so tests hit the same URLs as production. */
export function configureApp(app: INestApplication): void {
  // All routes live under /api/v{N} (version 1 by default); health probes stay at the root.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
