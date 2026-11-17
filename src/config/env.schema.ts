import { z } from 'zod';

/**
 * Every setting the app reads from the environment.
 *
 * The same Docker image runs in dev, qa and prod, so nothing
 * environment-specific may be baked into it. Boot fails with a list of
 * every invalid variable if this schema doesn't parse.
 */
export const envSchema = z.object({
  // Runtime mode for Node and libraries. Deployed containers always use
  // "production", whichever environment they run in.
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Which deployment this is. Shows up in logs and /health.
  APP_ENV: z.enum(['local', 'dev', 'qa', 'prod']).default('local'),
  // Release version (e.g. v1.4.0). Baked into the image at build time, so
  // it's identical in every environment that runs the image.
  APP_VERSION: z.string().min(1).default('local'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // postgres://user:pass@host:5432/db. For RDS, append
  // ?sslmode=verify-full&sslrootcert=/path/to/global-bundle.pem so the
  // connection is encrypted and the server certificate is verified.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  // Serve Swagger UI at /docs. Turn off where the API shouldn't be browsable.
  DOCS_ENABLED: z.stringbool().default(true),
  // Requests allowed per client IP per minute.
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),
  // HS256 key that signs access tokens. 32 random bytes as base64 is 44
  // characters, so anything shorter is too weak to accept.
  JWT_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;
