import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorsController } from './authors.controller.js';
import { AuthorsService } from './authors.service.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Author } from './entities/author.entity.js';
import { Category } from './entities/category.entity.js';
import { Quote } from './entities/quote.entity.js';
import { QuotesController } from './quotes.controller.js';
import { QuotesService } from './quotes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, Author, Category])],
  controllers: [QuotesController, AuthorsController, CategoriesController],
  providers: [QuotesService, AuthorsService, CategoriesService],
})
export class QuotesModule {}
