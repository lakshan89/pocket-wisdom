import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  const required = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

  it('requires DATABASE_URL', () => {
    expect(envSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(
      envSchema.safeParse({ DATABASE_URL: 'mysql://u:p@localhost/db' }).success,
    ).toBe(false);
  });

  it('applies defaults when optional variables are missing', () => {
    expect(envSchema.parse(required)).toEqual({
      ...required,
      DATABASE_POOL_MAX: 10,
      NODE_ENV: 'development',
      APP_ENV: 'local',
      APP_VERSION: 'local',
      PORT: 3000,
      LOG_LEVEL: 'info',
      DOCS_ENABLED: true,
      RATE_LIMIT_PER_MINUTE: 100,
    });
  });

  it('coerces PORT from a string', () => {
    expect(envSchema.parse({ ...required, PORT: '8080' }).PORT).toBe(8080);
  });

  it('parses DOCS_ENABLED=false as a boolean', () => {
    expect(
      envSchema.parse({ ...required, DOCS_ENABLED: 'false' }).DOCS_ENABLED,
    ).toBe(false);
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['APP_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
  ])('rejects %s=%s', (key, value) => {
    expect(envSchema.safeParse({ ...required, [key]: value }).success).toBe(
      false,
    );
  });
});
