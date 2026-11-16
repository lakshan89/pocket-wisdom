import { DataSource } from 'typeorm';
import { envSchema } from '../config/env.schema.js';
import { buildDataSourceOptions } from './data-source-options.js';

/**
 * Entry point for the TypeORM CLI (`npm run typeorm -- ...`), used during
 * development to generate migrations. Runs from dist/, after `npm run build`.
 */
export default new DataSource(
  buildDataSourceOptions(envSchema.parse(process.env)),
);
