import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { TestProject } from 'vitest/node';
import { buildDataSourceOptions } from '../../src/database/data-source-options.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer;

/**
 * Starts one throwaway Postgres for the whole e2e run and migrates it, the
 * same way the deploy pipeline migrates RDS. Needs a running Docker daemon.
 */
export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const databaseUrl = container.getConnectionUri();

  const dataSource = new DataSource(
    buildDataSourceOptions({ DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: 2 }),
  );
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });
  await dataSource.destroy();

  project.provide('databaseUrl', databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
