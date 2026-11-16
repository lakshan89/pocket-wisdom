import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    // One run covers both projects, so coverage counts code exercised by
    // either. Most service and controller code is only reached end to end.
    coverage: {
      provider: 'v8',
      // lcov.info is the file SonarQube Cloud imports.
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          globalSetup: ['./test/support/global-setup.ts'],
          setupFiles: ['./test/support/setup-env.ts'],
          // Pulling the Postgres image can take a while on the first run.
          hookTimeout: 120_000,
          // ConfigModule reads the environment when AppModule is imported,
          // so test settings must exist before any test file loads.
          env: {
            NODE_ENV: 'test',
            APP_ENV: 'dev',
            APP_VERSION: 'v9.9.9',
            LOG_LEVEL: 'fatal',
            // Suites make hundreds of requests from one IP.
            RATE_LIMIT_PER_MINUTE: '10000',
          },
        },
      },
    ],
  },
});
