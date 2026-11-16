import { Author } from '../quotes/entities/author.entity.js';
import { Category } from '../quotes/entities/category.entity.js';
import { Quote } from '../quotes/entities/quote.entity.js';

/**
 * Every entity, listed explicitly. Path globs break under ESM because the
 * files are .ts in src/ but .js in dist/.
 */
export const entities = [Author, Category, Quote];
