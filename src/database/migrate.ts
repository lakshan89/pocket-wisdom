import { runDatabaseTask } from './run-task.js';

/**
 * Applies pending migrations. The deploy pipeline runs this as a one-off
 * container from the new image (docker run on EC2, ecs run-task on
 * Fargate) before rolling out, so the app never starts against an old
 * schema and parallel app instances never race to migrate.
 *
 *   node dist/database/migrate.js
 */
await runDatabaseTask('migrate', async (dataSource, logger) => {
  // Each migration commits on its own: if the third of three fails, the
  // first two stay applied and a rerun picks up from the failure.
  const applied = await dataSource.runMigrations({ transaction: 'each' });
  logger.info(
    { applied: applied.map((m) => m.name) },
    applied.length
      ? `applied ${applied.length} migration(s)`
      : 'schema up to date',
  );
});
