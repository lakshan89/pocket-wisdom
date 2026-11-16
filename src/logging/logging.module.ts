import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from '../config/env.schema.js';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Reuses the caller's x-request-id when present so one ID follows a request
 * across services, otherwise generates one. The ID goes on every log line
 * written during the request and back to the client in the response header.
 */
export function resolveRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && /^[\w-]{1,128}$/.test(incoming)
      ? incoming
      : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const appEnv = config.get('APP_ENV', { infer: true });
        // pino-pretty is a devDependency, so it only exists outside the
        // production image. Key on NODE_ENV, not APP_ENV: a container run
        // locally still has APP_ENV=local but no dev dependencies.
        const pretty =
          config.get('NODE_ENV', { infer: true }) === 'development';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            // JSON to stdout everywhere except `npm run start:dev`.
            // Docker/ECS ship stdout to CloudWatch.
            transport: pretty
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
            base: { env: appEnv },
            genReqId: resolveRequestId,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            // Load balancer health checks would otherwise flood the logs.
            autoLogging: {
              ignore: (req) => req.url?.startsWith('/health') ?? false,
            },
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
