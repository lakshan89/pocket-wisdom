import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { QuoteDto } from '../src/quotes/quotes.schemas.js';
import { seedData } from '../src/database/seed/seed-data.js';
import { createTestApp } from './support/create-app.js';

const TOTAL_QUOTES = seedData.authors.flatMap((a) => a.quotes).length;
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Quotes API (e2e)', () => {
  let app: NestExpressApplication;
  const get = (url: string) => request(app.getHttpServer()).get(url);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/quotes/random', () => {
    it('returns one quote with its author and categories', async () => {
      const res = await get('/v1/quotes/random').expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toEqual({
        id: expect.any(String),
        text: expect.any(String),
        author: { slug: expect.any(String), name: expect.any(String) },
        categories: expect.arrayContaining([
          { slug: expect.any(String), name: expect.any(String) },
        ]),
      });
    });

    it('honours author and category filters', async () => {
      for (let i = 0; i < 5; i++) {
        const { body } = await get(
          '/v1/quotes/random?author=seneca&category=stoicism',
        ).expect(200);
        const quote = body as QuoteDto;
        expect(quote.author.slug).toBe('seneca');
        expect(quote.categories.map((c) => c.slug)).toContain('stoicism');
      }
    });

    it('returns 404 when nothing matches', async () => {
      const res = await get('/v1/quotes/random?author=seneca&category=humor')
        .expect(404)
        .expect('content-type', /problem\+json/);
      expect(res.body.detail).toBe('No quotes match these filters');
    });

    it('returns 400 for a malformed filter', async () => {
      const res = await get('/v1/quotes/random?category=Not%20A%20Slug').expect(
        400,
      );
      expect(res.body.errors).toEqual([
        { path: 'category', message: 'must be a lowercase-kebab-case slug' },
      ]);
    });
  });

  describe('GET /v1/quotes', () => {
    it('paginates through every quote without gaps or repeats', async () => {
      const ids = new Set<string>();
      for (let offset = 0; offset < TOTAL_QUOTES; offset += 30) {
        const { body } = await get(
          `/v1/quotes?limit=30&offset=${offset}`,
        ).expect(200);
        expect(body.meta).toEqual({ total: TOTAL_QUOTES, limit: 30, offset });
        (body.data as QuoteDto[]).forEach((q) => ids.add(q.id));
      }
      expect(ids.size).toBe(TOTAL_QUOTES);
    });

    it('defaults to 20 per page', async () => {
      const { body } = await get('/v1/quotes').expect(200);
      expect(body.data).toHaveLength(20);
      expect(body.meta).toMatchObject({ limit: 20, offset: 0 });
    });

    it("filters by category but keeps each quote's other categories", async () => {
      const { body } = await get(
        '/v1/quotes?category=stoicism&limit=50',
      ).expect(200);
      const quotes = body.data as QuoteDto[];
      const expected = seedData.authors
        .flatMap((a) => a.quotes)
        .filter((q) => q.categories.includes('stoicism'));

      expect(body.meta.total).toBe(expected.length);
      for (const quote of quotes) {
        expect(quote.categories.map((c) => c.slug)).toContain('stoicism');
      }
      // Some stoicism quotes have a second category; it must not be dropped.
      expect(quotes.some((q) => q.categories.length > 1)).toBe(true);
    });

    it('combines author and category filters', async () => {
      const { body } = await get(
        '/v1/quotes?author=marcus-aurelius&category=change',
      ).expect(200);
      expect(body.meta.total).toBe(2);
      for (const quote of body.data as QuoteDto[]) {
        expect(quote.author.slug).toBe('marcus-aurelius');
      }
    });

    it('returns an empty page for an unknown category', async () => {
      const { body } = await get('/v1/quotes?category=no-such-thing').expect(
        200,
      );
      expect(body).toEqual({
        data: [],
        meta: { total: 0, limit: 20, offset: 0 },
      });
    });

    it.each(['limit=0', 'limit=51', 'offset=-1', 'limit=abc'])(
      'returns 400 for %s',
      async (query) => {
        const res = await get(`/v1/quotes?${query}`).expect(400);
        expect(res.body.detail).toBe('Validation failed');
      },
    );
  });

  describe('GET /v1/quotes/:id', () => {
    it('returns the quote', async () => {
      const { body: page } = await get('/v1/quotes?limit=1').expect(200);
      const [first] = page.data as QuoteDto[];
      const { body } = await get(`/v1/quotes/${first.id}`).expect(200);
      expect(body).toEqual(first);
    });

    it('returns 404 for an unknown id', async () => {
      await get(`/v1/quotes/${MISSING_ID}`).expect(404);
    });

    it('returns 400 for a non-UUID id', async () => {
      const res = await get('/v1/quotes/42').expect(400);
      expect(res.body.errors).toEqual([{ message: 'Invalid UUID' }]);
    });
  });

  describe('authors', () => {
    it('GET /v1/authors lists authors sorted by name', async () => {
      const { body } = await get('/v1/authors?limit=50').expect(200);
      expect(body.meta.total).toBe(seedData.authors.length);
      const names = (body.data as { name: string }[]).map((a) => a.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(body.data[0]).toEqual({
        slug: expect.any(String),
        name: expect.any(String),
      });
    });

    it('GET /v1/authors/:slug returns one author', async () => {
      await get('/v1/authors/seneca')
        .expect(200)
        .expect({ slug: 'seneca', name: 'Seneca' });
    });

    it('GET /v1/authors/:slug returns 404 for an unknown author', async () => {
      await get('/v1/authors/nobody').expect(404);
    });

    it("GET /v1/authors/:slug/quotes returns only that author's quotes", async () => {
      const { body } = await get('/v1/authors/confucius/quotes').expect(200);
      const expected = seedData.authors.find((a) => a.slug === 'confucius')!;
      expect(body.meta.total).toBe(expected.quotes.length);
      for (const quote of body.data as QuoteDto[]) {
        expect(quote.author.slug).toBe('confucius');
      }
    });

    it('GET /v1/authors/:slug/quotes returns 404 for an unknown author', async () => {
      await get('/v1/authors/nobody/quotes').expect(404);
    });
  });

  describe('categories', () => {
    it('GET /v1/categories lists every category sorted by name', async () => {
      const { body } = await get('/v1/categories').expect(200);
      const names = (body.data as { name: string }[]).map((c) => c.name);
      expect(names).toHaveLength(seedData.categories.length);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it('GET /v1/categories/:slug/quotes returns quotes in the category', async () => {
      const { body } = await get('/v1/categories/humor/quotes?limit=50').expect(
        200,
      );
      expect(body.meta.total).toBeGreaterThan(0);
      for (const quote of body.data as QuoteDto[]) {
        expect(quote.categories.map((c) => c.slug)).toContain('humor');
      }
    });

    it('GET /v1/categories/:slug/quotes returns 404 for an unknown category', async () => {
      await get('/v1/categories/no-such-thing/quotes').expect(404);
    });
  });
});
