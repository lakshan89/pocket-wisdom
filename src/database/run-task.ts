import { pino, type Logger } from 'pino';
import { DataSource } from 'typeorm';
import { envSchema } from '../config/env.schema.js';
import { buildDataSourceOptions } from './data-source-options.js';

/**
 * Runs a one-off database task outside the Nest app (migrate, seed), with
 * the same config validation and JSON logging. Exits 1 on failure, so the
 * deploy pipeline stops before rolling out a new version.
 */
export async function runDatabaseTask(
  task: string,
  fn: (dataSource: DataSource, logger: Logger) => Promise<void>,
): Promise<void> {
  const env = envSchema.parse(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { env: env.APP_ENV, task, version: env.APP_VERSION },
  });
  const dataSource = new DataSource(buildDataSourceOptions(env));

  try {
    await dataSource.initialize();
    await fn(dataSource, logger);
  } catch (err) {
    logger.error({ err }, `${task} failed`);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
