import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Author } from './author.entity.js';
import { Category } from './category.entity.js';

@Entity({ name: 'quotes' })
// The natural key. The seed script upserts on it, so reruns don't duplicate.
@Unique('uq_quotes_author_id_text', ['authorId', 'text'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Index('ix_quotes_author_id')
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  // RESTRICT: deleting an author who still has quotes is an error, not a
  // silent cascade.
  @ManyToOne(() => Author, (author) => author.quotes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'author_id' })
  author: Relation<Author>;

  @ManyToMany(() => Category, (category) => category.quotes)
  @JoinTable({
    name: 'quote_categories',
    joinColumn: { name: 'quote_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Relation<Category[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
