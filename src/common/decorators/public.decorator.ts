import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as reachable without a JWT.
 *
 * Has no effect until a global auth guard exists. That guard should read
 * this flag with Reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler,
 * class]) and skip authentication when it's true.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
