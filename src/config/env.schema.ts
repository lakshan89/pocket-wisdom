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
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;
