import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Quote } from './quote.entity.js';

@Entity({ name: 'authors' })
export class Author {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** URL-safe identifier, e.g. "marcus-aurelius". */
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  // Relation<> stops TypeScript emitting a runtime reference to Quote,
  // which would break on the circular import under ESM.
  @OneToMany(() => Quote, (quote) => quote.author)
  quotes: Relation<Quote[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
