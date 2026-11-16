import { paginationQuerySchema } from './pagination.js';

describe('paginationQuerySchema', () => {
  it('defaults to the first 20 items', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('coerces query-string numbers', () => {
    expect(paginationQuerySchema.parse({ limit: '5', offset: '10' })).toEqual({
      limit: 5,
      offset: 10,
    });
  });

  it.each([
    { limit: '0' },
    { limit: '51' },
    { limit: '2.5' },
    { offset: '-1' },
    { offset: '10001' },
  ])('rejects %o', (query) => {
    expect(paginationQuerySchema.safeParse(query).success).toBe(false);
  });
});
