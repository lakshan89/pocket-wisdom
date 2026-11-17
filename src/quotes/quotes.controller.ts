import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '@nestjs/authentication';
import { toOpenApi } from '../common/openapi.js';
import type { Page } from '../common/pagination.js';
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  quoteIdSchema,
  quotePageSchema,
  quoteSchema,
  randomQuoteQuerySchema,
  type CreateQuoteBody,
  type ListQuotesQuery,
  type QuoteDto,
  type RandomQuoteQuery,
} from './quotes.schemas.js';
import { QuotesService } from './quotes.service.js';

// Reads are public; writes need a bearer token.
@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  // Declared before :id so "random" isn't parsed as an id.
  @Public()
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

  @Public()
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

  @Public()
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

  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Add a quote',
    description:
      'Links the quote to the author and category whose slug matches the ' +
      'given name, creating either one if it does not exist yet.',
  })
  @ApiCreatedResponse({ schema: toOpenApi(quoteSchema) })
  @ApiBadRequestResponse({ description: 'Missing or invalid field' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiConflictResponse({ description: 'The author already has this quote' })
  create(
    @Body({ schema: createQuoteSchema }) body: CreateQuoteBody,
  ): Promise<QuoteDto> {
    return this.quotes.create(body);
  }
}
