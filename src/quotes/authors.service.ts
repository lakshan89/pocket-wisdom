import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Page, Pagination } from '../common/pagination.js';
import { Author } from './entities/author.entity.js';
import { toAuthorDto, type AuthorDto } from './quotes.schemas.js';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author) private readonly authors: Repository<Author>,
  ) {}

  async list(page: Pagination): Promise<Page<AuthorDto>> {
    const [authors, total] = await this.authors.findAndCount({
      order: { name: 'ASC', id: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return { data: authors.map(toAuthorDto), meta: { total, ...page } };
  }

  async findBySlug(slug: string): Promise<AuthorDto> {
    const author = await this.authors.findOneBy({ slug });
    if (!author) {
      throw new NotFoundException(`Author "${slug}" not found`);
    }
    return toAuthorDto(author);
  }
}
