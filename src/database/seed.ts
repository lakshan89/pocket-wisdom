import { runDatabaseTask } from './run-task.js';
import { seedData } from './seed/seed-data.js';
import { seed } from './seed/seed.js';

/**
 * Loads the bundled quotes. Idempotent, so the pipeline can run it after
 * every migrate.
 *
 *   node dist/database/seed.js
 */
await runDatabaseTask('seed', async (dataSource, logger) => {
  const result = await seed(dataSource, seedData);
  logger.info(result, 'seed data in place');
});
