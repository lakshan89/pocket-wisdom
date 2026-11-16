import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // ConfigModule reads the environment when AppModule is imported, so
    // test settings must exist before any test file loads.
    env: {
      NODE_ENV: 'test',
      APP_ENV: 'dev',
      APP_VERSION: 'v9.9.9',
      LOG_LEVEL: 'fatal',
    },
  },
});
