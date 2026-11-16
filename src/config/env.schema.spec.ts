import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  it('applies defaults when variables are missing', () => {
    expect(envSchema.parse({})).toEqual({
      NODE_ENV: 'development',
      APP_ENV: 'local',
      PORT: 3000,
      LOG_LEVEL: 'info',
    });
  });

  it('coerces PORT from a string', () => {
    expect(envSchema.parse({ PORT: '8080' }).PORT).toBe(8080);
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['APP_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
  ])('rejects %s=%s', (key, value) => {
    expect(envSchema.safeParse({ [key]: value }).success).toBe(false);
  });
});
