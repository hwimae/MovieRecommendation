import type { UserWithPasswordHash } from '../users/users.model';
import { EmailAlreadyInUseError, type UsersRepository } from '../users/users.repository';
import { createAuthService } from './auth.service';

function createUser(overrides: Partial<UserWithPasswordHash> = {}): UserWithPasswordHash {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'user1',
    email: 'boo@example.com',
    name: 'Boo',
    role: 'USER',
    status: 'APPROVED',
    passwordHash: 'stored-hash',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createDeps() {
  const usersRepository: jest.Mocked<UsersRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    listByStatus: jest.fn(),
    updateStatus: jest.fn(),
  };

  return {
    usersRepository,
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
    tokenService: { signAccessToken: jest.fn(), verifyAccessToken: jest.fn() },
  };
}

describe('createAuthService', () => {
  describe('register', () => {
    it('creates a pending user and returns the public profile', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      deps.passwordHasher.hash.mockResolvedValue('new-hash');
      deps.usersRepository.create.mockResolvedValue({
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const service = createAuthService(deps);

      const result = await service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' });

      expect(deps.usersRepository.create).toHaveBeenCalledWith({
        email: 'boo@example.com',
        passwordHash: 'new-hash',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
      });
      expect(result).toEqual({
        user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'PENDING' },
        message: 'Registration pending approval',
      });
    });

    it('rejects an email that already exists', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      const service = createAuthService(deps);

      await expect(
        service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email already exists' });
      expect(deps.usersRepository.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate-at-create race to the same conflict', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      deps.passwordHasher.hash.mockResolvedValue('new-hash');
      deps.usersRepository.create.mockRejectedValue(new EmailAlreadyInUseError());
      const service = createAuthService(deps);

      await expect(
        service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email already exists' });
    });
  });

  describe('login', () => {
    it('rejects unknown emails', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'missing@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('rejects wrong passwords', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      deps.passwordHasher.compare.mockResolvedValue(false);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'wrong-pass' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('rejects pending accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser({ status: 'PENDING' }));
      deps.passwordHasher.compare.mockResolvedValue(true);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'Account pending approval' });
    });

    it('rejects rejected accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser({ status: 'REJECTED' }));
      deps.passwordHasher.compare.mockResolvedValue(true);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'Account rejected' });
    });

    it('returns the public user and an access token for approved accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      deps.passwordHasher.compare.mockResolvedValue(true);
      deps.tokenService.signAccessToken.mockReturnValue('access-token');
      const service = createAuthService(deps);

      const result = await service.login({ email: 'boo@example.com', password: 'password123' });

      expect(deps.passwordHasher.compare).toHaveBeenCalledWith('password123', 'stored-hash');
      expect(deps.tokenService.signAccessToken).toHaveBeenCalledWith({
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'APPROVED',
      });
      expect(result).toEqual({
        user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'APPROVED' },
        accessToken: 'access-token',
      });
    });
  });
});
