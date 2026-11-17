import { z } from 'zod';
import { pageSchema, paginationQuerySchema } from '../common/pagination.js';
import type { Author } from './entities/author.entity.js';
import type { Category } from './entities/category.entity.js';
import type { Quote } from './entities/quote.entity.js';

// ---- Request schemas ------------------------------------------------------

export const slugSchema = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase-kebab-case slug');

export const quoteIdSchema = z.uuid();

const filters = {
  author: slugSchema.optional().describe('Author slug, e.g. seneca'),
  category: slugSchema.optional().describe('Category slug, e.g. stoicism'),
};

export const randomQuoteQuerySchema = z.object(filters);
export type RandomQuoteQuery = z.output<typeof randomQuoteQuerySchema>;

export const listQuotesQuerySchema = paginationQuerySchema.extend(filters);
export type ListQuotesQuery = z.output<typeof listQuotesQuerySchema>;

export type QuoteFilters = Pick<ListQuotesQuery, 'author' | 'category'>;

/** Latin letters that NFKD leaves whole, so the accent strip misses them. */
const LATIN_LETTERS: Record<string, string> = {
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  đ: 'd',
  ł: 'l',
  þ: 'th',
};

/**
 * Turns a display name into a slug: "Lao Tzu" becomes "lao-tzu" and
 * "Søren Kierkegaard" becomes "soren-kierkegaard". Returns "" when the name
 * has no Latin letters or digits.
 */
export function toSlug(name: string, maxLength: number): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents split off by NFKD
    .toLowerCase()
    .replace(/[øæœßđłþ]/g, (c) => LATIN_LETTERS[c])
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, '');
}

/** Slug column lengths, from the entities. */
export const AUTHOR_SLUG_MAX = 120;
export const CATEGORY_SLUG_MAX = 60;

const displayName = (max: number, slugMax: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((name) => toSlug(name, slugMax) !== '', {
      message: 'must contain a Latin letter or digit',
    });

export const createQuoteSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  author: displayName(200, AUTHOR_SLUG_MAX).describe(
    'Author name, e.g. Marcus Aurelius. Created if no author has its slug.',
  ),
  category: displayName(100, CATEGORY_SLUG_MAX).describe(
    'Category name, e.g. Stoicism. Created if no category has its slug.',
  ),
});
export type CreateQuoteBody = z.output<typeof createQuoteSchema>;

// ---- Response schemas -----------------------------------------------------
// These only describe the API (types and Swagger). Responses are built by
// the mappers below and aren't validated at runtime.

export const authorSchema = z.object({
  slug: z.string(),
  name: z.string(),
});
export type AuthorDto = z.infer<typeof authorSchema>;

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const quoteSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  author: authorSchema,
  categories: z.array(categorySchema),
});
export type QuoteDto = z.infer<typeof quoteSchema>;

export const quotePageSchema = pageSchema(quoteSchema);
export const authorPageSchema = pageSchema(authorSchema);
export const categoryListSchema = z.object({ data: z.array(categorySchema) });

// ---- Mappers ----------------------------------------------------------------
// Entities never leave the service layer as-is: internal ids and
// timestamps stay private, and adding a column can't change the API.

export const toAuthorDto = ({ slug, name }: Author): AuthorDto => ({
  slug,
  name,
});

export const toCategoryDto = ({ slug, name }: Category): CategoryDto => ({
  slug,
  name,
});

/** Expects `author` and `categories` to be loaded. */
export const toQuoteDto = (quote: Quote): QuoteDto => ({
  id: quote.id,
  text: quote.text,
  author: toAuthorDto(quote.author),
  categories: [...quote.categories]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(toCategoryDto),
});
