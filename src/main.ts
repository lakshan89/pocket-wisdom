import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  // Buffer startup logs until the pino logger is ready, so they're JSON too.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Containers get SIGTERM on every deploy. Shutdown hooks let Nest close
  // open connections before the process exits.
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
