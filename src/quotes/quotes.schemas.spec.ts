import type { Quote } from './entities/quote.entity.js';
import {
  listQuotesQuerySchema,
  slugSchema,
  toQuoteDto,
} from './quotes.schemas.js';

describe('toQuoteDto', () => {
  const quote = {
    id: '6f1c0d1e-1111-4111-8111-111111111111',
    text: 'Character is destiny.',
    authorId: 'internal-author-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'internal-author-id',
      slug: 'heraclitus',
      name: 'Heraclitus',
    },
    categories: [
      { id: 'c2', slug: 'virtue', name: 'Virtue' },
      { id: 'c1', slug: 'change', name: 'Change' },
    ],
  } as unknown as Quote;

  it('exposes only public fields', () => {
    expect(toQuoteDto(quote)).toEqual({
      id: quote.id,
      text: 'Character is destiny.',
      author: { slug: 'heraclitus', name: 'Heraclitus' },
      categories: [
        { slug: 'change', name: 'Change' },
        { slug: 'virtue', name: 'Virtue' },
      ],
    });
  });

  it('sorts categories by slug without mutating the entity', () => {
    toQuoteDto(quote);
    expect(quote.categories.map((c) => c.slug)).toEqual(['virtue', 'change']);
  });
});

describe('slugSchema', () => {
  it.each(['seneca', 'marcus-aurelius', 'a1'])('accepts %s', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(['Seneca', 'marcus_aurelius', '-x', 'x-', "x'; DROP TABLE quotes"])(
    'rejects %s',
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false);
    },
  );
});

describe('listQuotesQuerySchema', () => {
  it('combines filters and pagination', () => {
    expect(
      listQuotesQuerySchema.parse({ category: 'stoicism', limit: '5' }),
    ).toEqual({ category: 'stoicism', limit: 5, offset: 0 });
  });
});
