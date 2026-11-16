import { DataSource } from 'typeorm';
import { inject } from 'vitest';
import { buildDataSourceOptions } from '../src/database/data-source-options.js';
import { seedData } from '../src/database/seed/seed-data.js';
import { seed } from '../src/database/seed/seed.js';
import { Author } from '../src/quotes/entities/author.entity.js';
import { Quote } from '../src/quotes/entities/quote.entity.js';

describe('seed (e2e)', () => {
  let dataSource: DataSource;

  const counts = async () => {
    const [row] = await dataSource.query<Record<string, string>[]>(`
      SELECT (SELECT count(*) FROM authors)          AS authors,
             (SELECT count(*) FROM categories)       AS categories,
             (SELECT count(*) FROM quotes)           AS quotes,
             (SELECT count(*) FROM quote_categories) AS links`);
    return row;
  };

  beforeAll(async () => {
    dataSource = new DataSource(
      buildDataSourceOptions({
        DATABASE_URL: inject('databaseUrl'),
        DATABASE_POOL_MAX: 2,
      }),
    );
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('is idempotent', async () => {
    // global-setup.ts already seeded once
    const before = await counts();
    await seed(dataSource, seedData);
    expect(await counts()).toEqual(before);
    expect(Number(before.quotes)).toBe(
      seedData.authors.flatMap((a) => a.quotes).length,
    );
  });

  it('links quotes to their categories', async () => {
    const quote = await dataSource.getRepository(Quote).findOneOrFail({
      where: { text: 'The unexamined life is not worth living.' },
      relations: { author: true, categories: true },
    });
    expect(quote.author.slug).toBe('socrates');
    expect(quote.categories.map((c) => c.slug).sort()).toEqual([
      'life',
      'wisdom',
    ]);
  });

  it('updates names on rerun', async () => {
    const renamed = structuredClone(seedData);
    renamed.authors[0].name = 'Renamed For Test';
    await seed(dataSource, renamed);

    const author = await dataSource
      .getRepository(Author)
      .findOneByOrFail({ slug: renamed.authors[0].slug });
    expect(author.name).toBe('Renamed For Test');

    await seed(dataSource, seedData); // restore for other suites
  });
});
