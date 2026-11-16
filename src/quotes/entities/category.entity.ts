import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Quote } from './quote.entity.js';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** URL-safe identifier, e.g. "stoicism". */
  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ManyToMany(() => Quote, (quote) => quote.categories)
  quotes: Relation<Quote[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
