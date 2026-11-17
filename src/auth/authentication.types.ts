import type { User } from '../users/user.entity.js';

// Module augmentation: adds our User type to the package's empty
// AuthenticationTypes interface, so @CurrentUser() is typed as User
// instead of unknown.
declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
  }
}
