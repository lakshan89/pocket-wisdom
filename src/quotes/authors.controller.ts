import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@nestjs/authentication';
import { toOpenApi } from '../common/openapi.js';
import {
  paginationQuerySchema,
  type Page,
  type Pagination,
} from '../common/pagination.js';
import { AuthorsService } from './authors.service.js';
import {
  authorPageSchema,
  authorSchema,
  quotePageSchema,
  slugSchema,
  type AuthorDto,
  type QuoteDto,
} from './quotes.schemas.js';
import { QuotesService } from './quotes.service.js';

@ApiTags('authors')
@Public()
@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly authors: AuthorsService,
    private readonly quotes: QuotesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List authors, sorted by name' })
  @ApiOkResponse({ schema: toOpenApi(authorPageSchema) })
  list(
    @Query({ schema: paginationQuerySchema }) page: Pagination,
  ): Promise<Page<AuthorDto>> {
    return this.authors.list(page);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'One author by slug' })
  @ApiOkResponse({ schema: toOpenApi(authorSchema) })
  @ApiNotFoundResponse({ description: 'No author with this slug' })
  findOne(
    @Param('slug', { schema: slugSchema }) slug: string,
  ): Promise<AuthorDto> {
    return this.authors.findBySlug(slug);
  }

  @Get(':slug/quotes')
  @ApiOperation({ summary: "An author's quotes" })
  @ApiOkResponse({ schema: toOpenApi(quotePageSchema) })
  @ApiNotFoundResponse({ description: 'No author with this slug' })
  async quotesBy(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: paginationQuerySchema }) page: Pagination,
  ): Promise<Page<QuoteDto>> {
    // 404 for an unknown author, rather than an empty list that looks
    // like an author with no quotes.
    await this.authors.findBySlug(slug);
    return this.quotes.list({ author: slug }, page);
  }
}
