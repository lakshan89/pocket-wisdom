import { z } from 'zod';

export const MAX_PAGE_SIZE = 50;

/** ?limit=&offset= on every list endpoint. */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  // Deep offsets make Postgres read and discard every earlier row.
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type Pagination = z.output<typeof paginationQuerySchema>;

/** Envelope for list responses: `data` plus what's needed to fetch more. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      total: z.number().int().describe('Items matching the filters'),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  });
}

export interface Page<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}
