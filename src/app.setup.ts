import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { createValidationPipe } from './common/validation.pipe.js';
import type { Env } from './config/env.schema.js';

/**
 * App-wide HTTP setup. main.ts and the e2e tests both call this, so tests
 * exercise the same pipeline as production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Behind the ALB, req.ip would otherwise be the load balancer's address,
  // and rate limiting would treat every client as one.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        // The ALB serves plain HTTP until a domain and certificate exist.
        // Upgrading would make browsers fetch Swagger UI assets over HTTPS
        // and fail. Remove this override once HTTPS is in place.
        directives: { upgradeInsecureRequests: null },
      },
    }),
  );
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());

  if (config.get('DOCS_ENABLED', { infer: true })) {
    const document = new DocumentBuilder()
      .setTitle('Pocket Wisdom API')
      .setDescription('Random quotes, by author and category')
      .setVersion(config.get('APP_VERSION', { infer: true }))
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, document),
    );
  }
}
