import type { AuthenticationStorage } from '@nestjs/authentication';
import { authenticationStoreContract } from '@nestjs/authentication/testing';
import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { TypeOrmRefreshTokenStore } from '../src/auth/refresh-tokens/typeorm-refresh-token.store.js';
import { buildDataSourceOptions } from '../src/database/data-source-options.js';

/**
 * Runs the package's own checks for a refresh token store against real
 * Postgres, including the races: two refreshes with one token at once
 * must leave exactly one winner.
 */
describe('TypeOrmRefreshTokenStore', () => {
  const dataSource = new DataSource(
    buildDataSourceOptions({
      DATABASE_URL: inject('databaseUrl'),
      DATABASE_POOL_MAX: 4, // a pool, so concurrent calls really race
    }),
  );
  const storage = { registerSource: vi.fn() };

  beforeAll(async () => {
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const cases = authenticationStoreContract(
    () => ({
      refreshTokens: new TypeOrmRefreshTokenStore(
        dataSource,
        storage as unknown as AuthenticationStorage,
      ),
    }),
    { contracts: ['refreshTokens'], concurrent: true },
  );
  for (const c of cases) {
    it(c.name, c.run);
  }
});
