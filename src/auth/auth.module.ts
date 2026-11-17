import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationModule } from '@nestjs/authentication';
import type { Env } from '../config/env.schema.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { JwtAuth } from './jwt.auth.js';
import { TypeOrmRefreshTokenStore } from './refresh-tokens/typeorm-refresh-token.store.js';

@Module({
  imports: [
    // forRootAsync, not forRoot: forRoot's argument is evaluated at import
    // time, before ConfigModule has loaded and validated .env.
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        accessToken: {
          key: config.get('JWT_SECRET', { infer: true }),
          issuer: 'pocket-wisdom', // stored in the "iss" claim, checked on every request
          audience: 'pocket-wisdom-api', // stored in the "aud" claim
          ttl: '15m', // short-lived; POST /auth/token/refresh gets new ones
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuth, TypeOrmRefreshTokenStore],
})
export class AuthModule {}
