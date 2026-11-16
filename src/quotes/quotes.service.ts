import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';
import type { Page, Pagination } from '../common/pagination.js';
import { Quote } from './entities/quote.entity.js';
import {
  toQuoteDto,
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
