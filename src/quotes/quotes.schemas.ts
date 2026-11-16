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
