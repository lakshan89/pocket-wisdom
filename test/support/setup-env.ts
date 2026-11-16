import { inject } from 'vitest';

// Runs before each test file is imported, so ConfigModule sees the URL of
// the container started in global-setup.ts.
process.env.DATABASE_URL = inject('databaseUrl');
