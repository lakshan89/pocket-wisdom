import { inject } from 'vitest';

// Runs before each test file is imported, so ConfigModule sees the URL of
// the container started in global-setup.ts.
process.env.DATABASE_URL = inject('databaseUrl');
// Test-only signing key. Real keys come from .env locally and SSM when deployed.
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars!';
