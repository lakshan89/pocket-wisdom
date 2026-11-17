import { z } from 'zod';

const email = z.email().max(254);
// Max 128: long enough for passphrases, short enough that nobody can send
// a huge string to make scrypt do extra work.
const password = z.string().min(8).max(128);

export const signUpSchema = z.object({ email, password });
export type SignUpBody = z.output<typeof signUpSchema>;

// No min(8) here: sign-in must not reveal the password rules, and an old
// account might have a shorter password.
export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type SignInBody = z.output<typeof signInSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});
export type RefreshTokenBody = z.output<typeof refreshTokenSchema>;

// ---- Response schemas (Swagger only) --------------------------------------

export const userSchema = z.object({ id: z.uuid(), email: z.email() });
export type UserDto = z.infer<typeof userSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().describe('Access token lifetime in seconds'),
});
