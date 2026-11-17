import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  // Only the repository methods the service calls. Nothing touches a database.
  const repo = {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((data: Partial<User>) => data),
    save: vi.fn((user: Partial<User>) => ({ id: 'u1', ...user })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        // Same token @InjectRepository(User) asks for, so Nest injects the fake.
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('lowercases and trims the email on create', async () => {
    await service.create('  Bob@Example.COM ', 'hash');
    expect(repo.create).toHaveBeenCalledWith({
      email: 'bob@example.com',
      passwordHash: 'hash',
    });
  });

  it('looks up by normalised email and selects the hash', async () => {
    await service.findByEmailWithHash('Bob@Example.com');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'bob@example.com' },
      select: { id: true, email: true, passwordHash: true },
    });
  });
});
