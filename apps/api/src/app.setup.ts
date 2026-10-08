import { type INestApplication, ValidationPipe } from '@nestjs/common';

/** HTTP configuration shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  return app;
}
