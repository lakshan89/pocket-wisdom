import { AuthenticationRegistry } from '@nestjs/authentication';
import type { UsersService } from '../users/users.service.js';
import { JwtAuth } from './jwt.auth.js';

describe('JwtAuth', () => {
  const users = { findById: vi.fn() };
  const registry = { registerProvider: vi.fn() };
  let auth: JwtAuth;

  beforeEach(() => {
    vi.clearAllMocks();
    // No Nest module needed: construct it directly with fakes.
    auth = new JwtAuth(
      users as unknown as UsersService,
      registry as unknown as AuthenticationRegistry,
    );
  });

  it('registers itself with the guard', () => {
    expect(registry.registerProvider).toHaveBeenCalledWith(auth);
  });

  it('loads the user named by sub', async () => {
    users.findById.mockResolvedValue({ id: 'u1' });
    // Bracket access reaches a protected method in tests.
    await expect(auth['validate']({ sub: 'u1' })).resolves.toEqual({
      id: 'u1',
    });
    expect(users.findById).toHaveBeenCalledWith('u1');
  });

  it('rejects a token without sub', () => {
    expect(auth['validate']({})).toBeNull();
    expect(users.findById).not.toHaveBeenCalled();
  });
});
