import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.schema.js';
import { entities } from './entities.js';
import { migrations } from './migrations/index.js';

/**
 * The one definition of how the app talks to Postgres. The Nest module,
 * the TypeORM CLI and the migrate/seed scripts all build from this, so
 * they can't disagree about entities, migrations or connection settings.
 */
export function buildDataSourceOptions(
  env: Pick<Env, 'DATABASE_URL' | 'DATABASE_POOL_MAX'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    entities,
    migrations,
    // Schema changes only ever happen through reviewed migrations.
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'typeorm_migrations',
    // gen_random_uuid() is built into Postgres 13+. Without these two
    // options TypeORM uses uuid_generate_v4() and tries CREATE EXTENSION,
    // which the app's database user shouldn't be allowed to do.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    extra: { max: env.DATABASE_POOL_MAX },
  };
}
