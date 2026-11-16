import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/create-app.js';

describe('App (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the running version and environment', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', version: 'v9.9.9', env: 'dev' });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /health/ready reports the database as up', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });

  it('unknown routes return problem+json 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/nope')
      .expect(404)
      .expect('content-type', /application\/problem\+json/);
    expect(res.body).toMatchObject({ status: 404, title: 'Not Found' });
  });

  it('sets security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(res.body.info.version).toBe('v9.9.9');
  });
});
