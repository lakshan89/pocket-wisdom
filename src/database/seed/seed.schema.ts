import { z } from 'zod';

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lowercase-kebab-case');

/**
 * Shape and integrity rules for seed data: slugs are unique, every quote
 * names existing categories, and no author repeats a quote. Checked before
 * anything touches the database.
 */
export const seedDataSchema = z
  .object({
    categories: z.array(
      z.object({ slug: slug.max(60), name: z.string().min(1).max(100) }),
    ),
    authors: z.array(
      z.object({
        slug: slug.max(120),
        name: z.string().min(1).max(200),
        quotes: z
          .array(
            z.object({
              text: z.string().trim().min(1),
              categories: z.array(slug).min(1),
            }),
          )
          .min(1),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const duplicates = (values: string[]) =>
      values.filter((v, i) => values.indexOf(v) !== i);

    for (const dup of duplicates(data.categories.map((c) => c.slug))) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate category slug "${dup}"`,
      });
    }
    for (const dup of duplicates(data.authors.map((a) => a.slug))) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate author slug "${dup}"`,
      });
    }

    const categorySlugs = new Set(data.categories.map((c) => c.slug));
    for (const author of data.authors) {
      for (const dup of duplicates(author.quotes.map((q) => q.text))) {
        ctx.addIssue({
          code: 'custom',
          message: `${author.slug} has a duplicate quote: "${dup}"`,
        });
      }
      for (const quote of author.quotes) {
        for (const category of quote.categories) {
          if (!categorySlugs.has(category)) {
            ctx.addIssue({
              code: 'custom',
              message: `${author.slug} quote uses unknown category "${category}"`,
            });
          }
        }
      }
    }
  });

export type SeedData = z.input<typeof seedDataSchema>;
