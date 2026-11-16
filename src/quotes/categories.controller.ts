import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { toOpenApi } from '../common/openapi.js';
import {
  paginationQuerySchema,
  type Page,
  type Pagination,
} from '../common/pagination.js';
import { CategoriesService } from './categories.service.js';
import {
  categoryListSchema,
  quotePageSchema,
  slugSchema,
  type CategoryDto,
  type QuoteDto,
} from './quotes.schemas.js';
import { QuotesService } from './quotes.service.js';

@ApiTags('categories')
@Public()
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly quotes: QuotesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'All categories, sorted by name' })
  @ApiOkResponse({ schema: toOpenApi(categoryListSchema) })
  async list(): Promise<{ data: CategoryDto[] }> {
    return { data: await this.categories.list() };
  }

  @Get(':slug/quotes')
  @ApiOperation({ summary: 'Quotes in a category' })
  @ApiOkResponse({ schema: toOpenApi(quotePageSchema) })
  @ApiNotFoundResponse({ description: 'No category with this slug' })
  async quotesIn(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: paginationQuerySchema }) page: Pagination,
  ): Promise<Page<QuoteDto>> {
    await this.categories.findBySlug(slug);
    return this.quotes.list({ category: slug }, page);
  }
}
