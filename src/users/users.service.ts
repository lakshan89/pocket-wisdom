import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Used by JwtAuth (step 4) on every authenticated request. No hash. */
  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /** Used only by sign-in: the one query that needs the hash. */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: normaliseEmail(email) },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  /** Takes a hash, not a password: hashing belongs to auth (step 5). */
  create(email: string, passwordHash: string): Promise<User> {
    return this.users.save(
      this.users.create({ email: normaliseEmail(email), passwordHash }),
    );
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
