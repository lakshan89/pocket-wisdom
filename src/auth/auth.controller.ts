import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, Public, type TokenPair } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';
import { toOpenApi } from '../common/openapi.js';
import type { User } from '../users/user.entity.js';
import {
  refreshTokenSchema,
  signInSchema,
  signUpSchema,
  tokenPairSchema,
  userSchema,
  type RefreshTokenBody,
  type SignInBody,
  type SignUpBody,
  type UserDto,
} from './auth.schemas.js';
import { AuthService, toUserDto } from './auth.service.js';

/** Endpoints that take a password: 5 tries a minute per IP. */
const PASSWORD_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(PASSWORD_LIMIT)
  @Post('sign-up')
  @ApiOperation({ summary: 'Create an account' })
  @ApiCreatedResponse({ schema: toOpenApi(userSchema) })
  @ApiBadRequestResponse({ description: 'Invalid email or weak password' })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  signUp(@Body({ schema: signUpSchema }) body: SignUpBody): Promise<UserDto> {
    return this.auth.signUp(body);
  }

  @Public()
  @Throttle(PASSWORD_LIMIT)
  @HttpCode(200) // POST defaults to 201, but nothing is created here
  @Post('token')
  @ApiOperation({ summary: 'Sign in: exchange email and password for tokens' })
  @ApiOkResponse({ schema: toOpenApi(tokenPairSchema) })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  token(@Body({ schema: signInSchema }) body: SignInBody): Promise<TokenPair> {
    return this.auth.signIn(body);
  }

  // Public: the refresh token in the body is the credential, since the
  // access token has usually expired by the time a client calls this.
  @Public()
  @HttpCode(200)
  @Post('token/refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ schema: toOpenApi(tokenPairSchema) })
  @ApiUnauthorizedResponse({
    description: 'Refresh token unknown, expired, revoked or already used',
  })
  refresh(
    @Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenBody,
  ): Promise<TokenPair> {
    return this.auth.refresh(refreshToken);
  }

  @Public()
  @HttpCode(204)
  @Post('token/revoke')
  @ApiOperation({ summary: 'Sign out: revoke a refresh token and its family' })
  @ApiNoContentResponse({ description: 'Revoked, or the token was unknown' })
  revoke(
    @Body({ schema: refreshTokenSchema }) { refreshToken }: RefreshTokenBody,
  ): Promise<void> {
    return this.auth.revoke(refreshToken);
  }

  // No @Public(): the guard requires a bearer token, and JwtAuth loads the
  // user into @CurrentUser().
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'The signed-in user' })
  @ApiOkResponse({ schema: toOpenApi(userSchema) })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  me(@CurrentUser() user: User): UserDto {
    return toUserDto(user);
  }
}
