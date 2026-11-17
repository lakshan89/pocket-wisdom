import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@nestjs/authentication';
import { toOpenApi } from '../common/openapi.js';
import type { Page } from '../common/pagination.js';
import {
  listQuotesQuerySchema,
  quoteIdSchema,
  quotePageSchema,
  quoteSchema,
  randomQuoteQuerySchema,
  type ListQuotesQuery,
  type QuoteDto,
  type RandomQuoteQuery,
} from './quotes.schemas.js';
import { QuotesService } from './quotes.service.js';

@ApiTags('quotes')
@Public()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  // Declared before :id so "random" isn't parsed as an id.
  @Get('random')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'A random quote, optionally by author or category' })
  @ApiOkResponse({ schema: toOpenApi(quoteSchema) })
  @ApiNotFoundResponse({ description: 'No quote matches the filters' })
  @ApiBadRequestResponse({ description: 'Invalid filter' })
  random(
    @Query({ schema: randomQuoteQuerySchema }) query: RandomQuoteQuery,
  ): Promise<QuoteDto> {
    return this.quotes.random(query);
  }

  @Get()
  @ApiOperation({ summary: 'List quotes, optionally by author or category' })
  @ApiOkResponse({ schema: toOpenApi(quotePageSchema) })
  @ApiBadRequestResponse({ description: 'Invalid filter or pagination' })
  list(
    @Query({ schema: listQuotesQuerySchema }) query: ListQuotesQuery,
  ): Promise<Page<QuoteDto>> {
    const { author, category, limit, offset } = query;
    return this.quotes.list({ author, category }, { limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One quote by id' })
  @ApiOkResponse({ schema: toOpenApi(quoteSchema) })
  @ApiNotFoundResponse({ description: 'No quote with this id' })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  findOne(
    @Param('id', { schema: quoteIdSchema }) id: string,
  ): Promise<QuoteDto> {
    return this.quotes.findOne(id);
  }
}
