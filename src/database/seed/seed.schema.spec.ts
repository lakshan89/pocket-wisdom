import { seedData } from './seed-data.js';
import { seedDataSchema, type SeedData } from './seed.schema.js';

const valid: SeedData = {
  categories: [{ slug: 'wisdom', name: 'Wisdom' }],
  authors: [
    {
      slug: 'seneca',
      name: 'Seneca',
      quotes: [{ text: 'A quote.', categories: ['wisdom'] }],
    },
  ],
};

function messages(data: SeedData): string[] {
  const result = seedDataSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('seedDataSchema', () => {
  it('accepts the bundled seed data', () => {
    expect(messages(seedData)).toEqual([]);
  });

  it('bundles about 100 quotes', () => {
    const count = seedData.authors.flatMap((a) => a.quotes).length;
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it('rejects a quote with an unknown category', () => {
    const data = structuredClone(valid);
    data.authors[0].quotes[0].categories = ['nope'];
    expect(messages(data)).toEqual([
      'seneca quote uses unknown category "nope"',
    ]);
  });

  it('rejects duplicate slugs', () => {
    const data = structuredClone(valid);
    data.categories.push({ slug: 'wisdom', name: 'Again' });
    data.authors.push({ ...data.authors[0] });
    expect(messages(data)).toEqual([
      'duplicate category slug "wisdom"',
      'duplicate author slug "seneca"',
    ]);
  });

  it('rejects the same quote twice for one author', () => {
    const data = structuredClone(valid);
    data.authors[0].quotes.push({ text: 'A quote.', categories: ['wisdom'] });
    expect(messages(data)).toEqual([
      'seneca has a duplicate quote: "A quote."',
    ]);
  });

  it('rejects slugs that are not kebab-case', () => {
    const data = structuredClone(valid);
    data.authors[0].slug = 'Seneca The Younger';
    expect(messages(data)).toEqual(['must be lowercase-kebab-case']);
  });
});
