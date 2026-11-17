import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Repository,
  type EntityManager,
  type EntityTarget,
  type FindOptionsWhere,
  type SelectQueryBuilder,
} from 'typeorm';
import type { Page, Pagination } from '../common/pagination.js';
import { Author } from './entities/author.entity.js';
import { Category } from './entities/category.entity.js';
import { Quote } from './entities/quote.entity.js';
import {
  AUTHOR_SLUG_MAX,
  CATEGORY_SLUG_MAX,
  toQuoteDto,
  toSlug,
  type CreateQuoteBody,
  type QuoteDto,
  type QuoteFilters,
} from './quotes.schemas.js';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
  ) {}

  async list(filters: QuoteFilters, page: Pagination): Promise<Page<QuoteDto>> {
    const query = this.filteredIds(filters);
    const [total, rows] = await Promise.all([
      query.getCount(),
      query
        .clone()
        // Stable order, so pages don't overlap or skip quotes.
        .orderBy('q.createdAt', 'ASC')
        .addOrderBy('q.id', 'ASC')
        .offset(page.offset)
        .limit(page.limit)
        .getRawMany<{ id: string }>(),
    ]);

    const data = await this.loadInOrder(rows.map((r) => r.id));
    return { data, meta: { total, ...page } };
  }

  /**
   * ORDER BY random() scans every matching row, which is fine for a few
   * thousand quotes. Beyond that, pick a random offset from the count
   * instead.
   */
  async random(filters: QuoteFilters): Promise<QuoteDto> {
    const row = await this.filteredIds(filters)
      .orderBy('random()')
      .limit(1)
      .getRawOne<{ id: string }>();
    if (!row) {
      throw new NotFoundException('No quotes match these filters');
    }
    const [quote] = await this.loadInOrder([row.id]);
    return quote;
  }

  /**
   * Adds a quote in one transaction. The author and category are matched by
   * the slug of their name and created when missing; an existing one keeps
   * its name. Throws 409 if the author already has this exact text, and
   * then nothing is written, not even a new author or category.
   */
  async create(body: CreateQuoteBody): Promise<QuoteDto> {
    const id = await this.quotes.manager.transaction(async (em) => {
      const author = await findOrCreateBySlug(em, Author, {
        slug: toSlug(body.author, AUTHOR_SLUG_MAX),
        name: body.author,
      });
      const category = await findOrCreateBySlug(em, Category, {
        slug: toSlug(body.category, CATEGORY_SLUG_MAX),
        name: body.category,
      });

      // ON CONFLICT DO NOTHING on (author_id, text) returns no row for a
      // duplicate. Two concurrent requests can't both insert it.
      const inserted = await em
        .createQueryBuilder()
        .insert()
        .into(Quote)
        .values({ authorId: author.id, text: body.text })
        .orIgnore()
        .returning('id')
        .execute();
      const row = (inserted.raw as { id: string }[])[0];
      if (!row) {
        throw new ConflictException(`${author.name} already has this quote`);
      }

      await em
        .createQueryBuilder()
        .relation(Quote, 'categories')
        .of(row.id)
        .add(category.id);
      return row.id;
    });
    return this.findOne(id);
  }

  async findOne(id: string): Promise<QuoteDto> {
    const quote = await this.quotes.findOne({
      where: { id },
      relations: { author: true, categories: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }
    return toQuoteDto(quote);
  }

  /**
   * Selects only quote ids that match the filters. The category filter is
   * an EXISTS subquery rather than a join, so a quote matches once and the
   * full category list is loaded afterwards, not just the matching one.
   */
  private filteredIds(filters: QuoteFilters): SelectQueryBuilder<Quote> {
    const query = this.quotes.createQueryBuilder('q').select('q.id', 'id');

    if (filters.author) {
      query.innerJoin('q.author', 'a', 'a.slug = :author', {
        author: filters.author,
      });
    }
    if (filters.category) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM quote_categories qc
          JOIN categories c ON c.id = qc.category_id
          WHERE qc.quote_id = q.id AND c.slug = :category
        )`,
        { category: filters.category },
      );
    }
    return query;
  }

  /** Loads full quotes for the ids, keeping the ids' order. */
  private async loadInOrder(ids: string[]): Promise<QuoteDto[]> {
    if (ids.length === 0) return [];
    const quotes = await this.quotes.find({
      where: { id: In(ids) },
      relations: { author: true, categories: true },
    });
    const byId = new Map(quotes.map((q) => [q.id, q]));
    return ids.map((id) => toQuoteDto(byId.get(id)!));
  }
}

/**
 * Returns the row with this slug, inserting it first if there is none.
 * ON CONFLICT DO NOTHING makes a concurrent insert of the same slug safe.
 */
async function findOrCreateBySlug<T extends Author | Category>(
  em: EntityManager,
  entity: EntityTarget<T>,
  values: Pick<T, 'slug' | 'name'>,
): Promise<T> {
  await em
    .createQueryBuilder(entity, 'e')
    .insert()
    // TypeORM can't resolve its partial-entity type for a generic T.
    .values(values as never)
    .orIgnore()
    .execute();
  return em
    .getRepository(entity)
    .findOneByOrFail({ slug: values.slug } as FindOptionsWhere<T>);
}
