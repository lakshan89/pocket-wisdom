import { InitialSchema1794798688650 } from './1794798688650-InitialSchema.js';
import { AddUsers1794837683301 } from './1794837683301-AddUsers.js';
import { AddRefreshTokens1794881029967 } from './1794881029967-AddRefreshTokens.js';

/**
 * Every migration, in order. After `npm run migration:generate`, import the
 * new class here and append it, or it will never run.
 */
export const migrations = [
  InitialSchema1794798688650,
  AddUsers1794837683301,
  AddRefreshTokens1794881029967,
];
