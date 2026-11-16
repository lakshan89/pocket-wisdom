import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envSchema, type Env } from './config/env.schema.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    LoggingModule,
    HealthModule,
    // Limits are per instance (in-memory). With several Fargate tasks each
    // keeps its own count, which is fine for this project.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: 60_000,
          limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }),
        },
      ],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
