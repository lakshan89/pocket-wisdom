import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PasswordHasher,
  TokenService,
  type TokenPair,
} from '@nestjs/authentication';
import { QueryFailedError } from 'typeorm';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { SignInBody, SignUpBody, UserDto } from './auth.schemas.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async signUp({ email, password }: SignUpBody): Promise<UserDto> {
    const passwordHash = await this.hasher.hash(password);
    try {
      return toUserDto(await this.users.create(email, passwordHash));
    } catch (err) {
      // The unique constraint on users.email is the real duplicate check:
      // a "does it exist?" query first would race with a parallel sign-up.
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  async signIn({ email, password }: SignInBody): Promise<TokenPair> {
    const user = await this.users.findByEmailWithHash(email);
    // With no user, verify() still hashes against a dummy value, so an
    // unknown email takes as long as a wrong password, and both get the
    // same error: callers can't learn which emails have accounts.
    const ok = await this.hasher.verify(password, user?.passwordHash);
    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.tokens.issue(user.id, {
      method: 'password',
      claims: { amr: ['pwd'] },
    });
  }

  /** Single use: the old refresh token stops working. Reuse revokes the family. */
  refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.refresh(refreshToken);
  }

  /** Signs one device out. Unknown tokens are ignored (RFC 7009). */
  async revoke(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }
}

export function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}
