import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

/**
 * Accepts `Authorization: Bearer <access token>`. The base class verifies
 * the signature, exp, iss and aud against the module's accessToken options;
 * this class only maps the verified claims to a user.
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly users: UsersService,
    registry: AuthenticationRegistry,
  ) {
    // realm appears in the 401's WWW-Authenticate header.
    super({ realm: 'pocket-wisdom' });
    registry.registerProvider(this);
  }

  // Runs only after the token is verified. Returning null (no sub, or the
  // user was deleted since the token was issued) turns it into a 401.
  protected validate({ sub }: JwtClaims): Promise<User | null> | null {
    return sub ? this.users.findById(sub) : null;
  }
}
