import { randomUUID } from 'node:crypto';
import type { TokenPair } from '@nestjs/authentication';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/create-app.js';

/**
 * The /token route allows 5 requests a minute per IP, whatever
 * RATE_LIMIT_PER_MINUTE says. This file makes exactly 5 before the
 * rate-limit test, which must stay last.
 */
describe('Auth API (e2e)', () => {
  let app: NestExpressApplication;
  const http = () => request(app.getHttpServer());
  // Unique per run: the e2e database is shared across test files.
  const email = `user-${randomUUID()}@example.com`;
  const password = 'correct horse battery';
  let userId: string;

  const signIn = async (): Promise<TokenPair> =>
    (await http().post('/v1/auth/token').send({ email, password }).expect(200))
      .body as TokenPair;
  const refresh = (refreshToken: string) =>
    http().post('/v1/auth/token/refresh').send({ refreshToken });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/sign-up', () => {
    it('creates an account and never returns the hash', async () => {
      const res = await http()
        .post('/v1/auth/sign-up')
        .send({ email: email.toUpperCase(), password })
        .expect(201);
      expect(res.body).toEqual({ id: expect.any(String), email });
      userId = (res.body as { id: string }).id;
    });

    it('rejects a duplicate email, in any case, with 409', async () => {
      await http()
        .post('/v1/auth/sign-up')
        .send({ email: email.toUpperCase(), password })
        .expect(409)
        .expect('content-type', /problem\+json/);
    });

    it('rejects a short password with 400', async () => {
      await http()
        .post('/v1/auth/sign-up')
        .send({ email: `other-${randomUUID()}@example.com`, password: 'short' })
        .expect(400);
    });
  });

  describe('sign-in and /me', () => {
    it('issues tokens that open a protected route', async () => {
      const tokens = await signIn(); // /token request 1
      expect(tokens).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
      });

      const me = await http()
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(me.body).toEqual({ id: userId, email });
    });

    it('answers /me without a token with a bearer challenge', async () => {
      const res = await http().get('/v1/auth/me').expect(401);
      expect(res.headers['www-authenticate']).toMatch(/^Bearer realm=/);
    });

    it('gives a wrong password and an unknown email the same 401', async () => {
      const wrong = await http() // request 2
        .post('/v1/auth/token')
        .send({ email, password: 'wrong password' })
        .expect(401);
      const unknown = await http() // request 3
        .post('/v1/auth/token')
        .send({ email: `nobody-${randomUUID()}@example.com`, password })
        .expect(401);
      expect(wrong.body.detail).toBe('Invalid email or password');
      expect(unknown.body.detail).toBe(wrong.body.detail);
    });
  });

  describe('refresh and revoke', () => {
    it('rotates the refresh token, and reuse revokes the whole family', async () => {
      const first = await signIn(); // request 4

      const second = (await refresh(first.refreshToken).expect(200))
        .body as TokenPair;
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await http()
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .expect(200);

      // Using the old token again looks like theft: it fails, and so does
      // the newest token of the same family.
      await refresh(first.refreshToken).expect(401);
      await refresh(second.refreshToken).expect(401);
    });

    it('revoke signs the device out', async () => {
      const tokens = await signIn(); // request 5
      await http()
        .post('/v1/auth/token/revoke')
        .send({ refreshToken: tokens.refreshToken })
        .expect(204);
      await refresh(tokens.refreshToken).expect(401);
    });

    it('revoke accepts an unknown token (RFC 7009)', async () => {
      await http()
        .post('/v1/auth/token/revoke')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(204);
    });

    it('rejects an unknown refresh token with 401', async () => {
      await refresh('not-a-real-token').expect(401);
    });
  });

  // Must stay last: it uses up this IP's /token budget.
  it('rate-limits password guessing on /token', async () => {
    await http() // request 6
      .post('/v1/auth/token')
      .send({ email, password: 'guess' })
      .expect(429);
  });
});
