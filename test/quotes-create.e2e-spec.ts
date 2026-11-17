import { randomUUID } from 'node:crypto';
import type { TokenPair } from '@nestjs/authentication';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { inject } from 'vitest';
import { buildDataSourceOptions } from '../src/database/data-source-options.js';
import { Author } from '../src/quotes/entities/author.entity.js';
import { Category } from '../src/quotes/entities/category.entity.js';
import { Quote } from '../src/quotes/entities/quote.entity.js';
import type { CategoryDto, QuoteDto } from '../src/quotes/quotes.schemas.js';
import { createTestApp } from './support/create-app.js';

/**
 * Other suites count seeded rows, so every row made here is deleted in
 * afterAll. Names carry a per-run tag, so the slugs never clash with seed
 * data.
 */
describe('POST /v1/quotes (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let accessToken: string;
  const http = () => request(app.getHttpServer());
  const tag = randomUUID().slice(0, 8);
  const createdQuoteIds: string[] = [];

  const create = (body: object, token: string | null = accessToken) => {
    const req = http().post('/v1/quotes').send(body);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const categorySlugs = async () =>
    (
      (await http().get('/v1/categories').expect(200)).body
        .data as CategoryDto[]
    ).map((c) => c.slug);

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = new DataSource(
      buildDataSourceOptions({
        DATABASE_URL: inject('databaseUrl'),
        DATABASE_POOL_MAX: 2,
      }),
    );
    await dataSource.initialize();

    const credentials = {
      email: `writer-${tag}@example.com`,
      password: 'correct horse battery',
    };
    await http().post('/v1/auth/sign-up').send(credentials).expect(201);
    const { body } = await http()
      .post('/v1/auth/token')
      .send(credentials)
      .expect(200);
    accessToken = (body as TokenPair).accessToken;
  });

  afterAll(async () => {
    // Links go with the quotes (ON DELETE CASCADE). Authors go after their
    // quotes, because quotes.author_id is ON DELETE RESTRICT.
    await dataSource.getRepository(Quote).delete({ id: In(createdQuoteIds) });
    await dataSource
      .getRepository(Author)
      .delete({ slug: In([`new-author-${tag}`]) });
    await dataSource
      .getRepository(Category)
      .delete({ slug: In([`new-category-${tag}`, `rolled-back-${tag}`]) });
    await dataSource.destroy();
    await app.close();
  });

  it('requires a bearer token', async () => {
    await create(
      { text: 'x', author: 'Seneca', category: 'Stoicism' },
      null,
    ).expect(401);
  });

  it('creates the author and category when they are new', async () => {
    const { body } = await create({
      text: `  A brand new quote ${tag}.  `,
      author: `New Author ${tag}`,
      category: `New Category ${tag}`,
    }).expect(201);
    const quote = body as QuoteDto;
    createdQuoteIds.push(quote.id);

    expect(quote).toEqual({
      id: expect.any(String),
      text: `A brand new quote ${tag}.`,
      author: { slug: `new-author-${tag}`, name: `New Author ${tag}` },
      categories: [
        { slug: `new-category-${tag}`, name: `New Category ${tag}` },
      ],
    });
    await http().get(`/v1/quotes/${quote.id}`).expect(200);
    await http().get(`/v1/authors/new-author-${tag}`).expect(200);
  });

  it('links to an existing author and category by slug, keeping names', async () => {
    const { body } = await create({
      text: `Another one for Seneca ${tag}.`,
      author: 'SENECA',
      category: 'stoicism',
    }).expect(201);
    const quote = body as QuoteDto;
    createdQuoteIds.push(quote.id);

    expect(quote.author).toEqual({ slug: 'seneca', name: 'Seneca' });
    expect(quote.categories).toEqual([{ slug: 'stoicism', name: 'Stoicism' }]);
  });

  it('rejects a duplicate with 409 and writes nothing', async () => {
    const res = await create({
      text: `Another one for Seneca ${tag}.`,
      author: 'Seneca',
      category: `Rolled Back ${tag}`,
    })
      .expect(409)
      .expect('content-type', /problem\+json/);
    expect(res.body.detail).toBe('Seneca already has this quote');
    // The category was inserted inside the failed transaction.
    expect(await categorySlugs()).not.toContain(`rolled-back-${tag}`);
  });

  it('returns 400 for missing or blank fields', async () => {
    const res = await create({ text: '  ', author: 'Seneca' }).expect(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'text' }),
        expect.objectContaining({ path: 'category' }),
      ]),
    );
  });
});
