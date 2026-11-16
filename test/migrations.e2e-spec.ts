import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/data-source-options.js';
import { migrations } from '../src/database/migrations/index.js';

/**
 * Uses its own database: reverting the schema under the shared one would
 * break the other suites running in parallel.
 */
describe('migrations', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    dataSource = new DataSource(
      buildDataSourceOptions({
        DATABASE_URL: container.getConnectionUri(),
        DATABASE_POOL_MAX: 2,
      }),
    );
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('apply, fully revert, and re-apply cleanly', async () => {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    expect(applied).toHaveLength(migrations.length);

    for (let i = 0; i < migrations.length; i++) {
      await dataSource.undoLastMigration({ transaction: 'each' });
    }
    const tables = await dataSource.query<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'typeorm_migrations'`,
    );
    expect(tables).toEqual([]);

    await dataSource.runMigrations({ transaction: 'each' });
  });

  it('leave the schema matching the entities', async () => {
    // Fails if someone changed an entity without generating a migration.
    const pending = await dataSource.driver.createSchemaBuilder().log();
    expect(pending.upQueries.map((q) => q.query)).toEqual([]);
  });
});
