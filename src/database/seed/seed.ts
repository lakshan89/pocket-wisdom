import type { DataSource } from 'typeorm';
import { Author } from '../../quotes/entities/author.entity.js';
import { Category } from '../../quotes/entities/category.entity.js';
import { Quote } from '../../quotes/entities/quote.entity.js';
import { seedDataSchema, type SeedData } from './seed.schema.js';

export interface SeedResult {
  authors: number;
  categories: number;
  quotes: number;
}

/**
 * Loads seed data in one transaction. Safe to run any number of times, in
 * any environment:
 * - authors and categories are upserted by slug (names get updated)
 * - quotes are inserted unless the same author already has the same text
 * - category links are added, never removed
 */
export async function seed(
  dataSource: DataSource,
  input: SeedData,
): Promise<SeedResult> {
  const data = seedDataSchema.parse(input);

  return dataSource.transaction(async (em) => {
    await em
      .getRepository(Category)
      .upsert(data.categories, { conflictPaths: ['slug'] });
    await em.getRepository(Author).upsert(
      data.authors.map(({ slug, name }) => ({ slug, name })),
      { conflictPaths: ['slug'] },
    );

    const authorIds = new Map(
      (await em.getRepository(Author).find()).map((a) => [a.slug, a.id]),
    );
    const categoryIds = new Map(
      (await em.getRepository(Category).find()).map((c) => [c.slug, c.id]),
    );

    const quoteRows = data.authors.flatMap((author) =>
      author.quotes.map((q) => ({
        authorId: authorIds.get(author.slug)!,
        text: q.text,
      })),
    );
    await em
      .createQueryBuilder()
      .insert()
      .into(Quote)
      .values(quoteRows)
      .orIgnore() // ON CONFLICT DO NOTHING, on the (author_id, text) key
      .execute();

    const quoteKey = (authorId: string, text: string) => `${authorId}\n${text}`;
    const quoteIds = new Map(
      (
        await em
          .getRepository(Quote)
          .find({ select: { id: true, authorId: true, text: true } })
      ).map((q) => [quoteKey(q.authorId, q.text), q.id]),
    );

    const links = data.authors.flatMap((author) =>
      author.quotes.flatMap((q) =>
        q.categories.map((category) => ({
          quote_id: quoteIds.get(
            quoteKey(authorIds.get(author.slug)!, q.text),
          )!,
          category_id: categoryIds.get(category)!,
        })),
      ),
    );
    await em
      .createQueryBuilder()
      .insert()
      .into('quote_categories')
      .values(links)
      .orIgnore()
      .execute();

    return {
      authors: data.authors.length,
      categories: data.categories.length,
      quotes: quoteRows.length,
    };
  });
}
