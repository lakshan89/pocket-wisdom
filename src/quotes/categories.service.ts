import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { toCategoryDto, type CategoryDto } from './quotes.schemas.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  /** Not paginated: categories are a short, curated list. */
  async list(): Promise<CategoryDto[]> {
    const categories = await this.categories.find({ order: { name: 'ASC' } });
    return categories.map(toCategoryDto);
  }

  async findBySlug(slug: string): Promise<CategoryDto> {
    const category = await this.categories.findOneBy({ slug });
    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }
    return toCategoryDto(category);
  }
}
