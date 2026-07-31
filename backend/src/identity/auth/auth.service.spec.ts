import { createAuthService } from './auth.service';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

function createDepsMock() {
  return {
    prisma: createPrismaMock(),
    passwordHasher: {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    },
    tokenService: {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
    },
  };
}

describe('createAuthService', () => {
  it('register creates a pending user and does not issue an access token', async () => {
    const deps = createDepsMock();
    deps.prisma.user.findUnique.mockResolvedValue(null);
    deps.prisma.user.create.mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'PENDING',
    });

    const service = createAuthService(deps as any);

    await expect(
      service.register({ name: 'Boo', email: 'boo@example.com', password: 'password123' }),
    ).resolves.toEqual({
      user: {
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
      },
      message: 'Registration pending approval',
    });

    expect(deps.prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'boo@example.com',
        passwordHash: 'hashed-password',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
      },
    });
    expect(deps.tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it('login rejects a pending user after password succeeds', async () => {
    const deps = createDepsMock();
    deps.prisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      passwordHash: 'hashed-password',
      role: 'USER',
      status: 'PENDING',
    });
    deps.passwordHasher.compare.mockResolvedValue(true);

    const service = createAuthService(deps as any);

    await expect(service.login({ email: 'boo@example.com', password: 'password123' })).rejects.toThrow(
      'Account pending approval',
    );
    expect(deps.tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it('login rejects a rejected user after password succeeds', async () => {
    const deps = createDepsMock();
    deps.prisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      passwordHash: 'hashed-password',
      role: 'USER',
      status: 'REJECTED',
    });
    deps.passwordHasher.compare.mockResolvedValue(true);

    const service = createAuthService(deps as any);

    await expect(service.login({ email: 'boo@example.com', password: 'password123' })).rejects.toThrow(
      'Account rejected',
    );
    expect(deps.tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it('login returns token and role/status for an approved user', async () => {
    const deps = createDepsMock();
    deps.prisma.user.findUnique.mockResolvedValue({
      id: 'admin1',
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: 'hashed-password',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    deps.passwordHasher.compare.mockResolvedValue(true);

    const service = createAuthService(deps as any);

    await expect(service.login({ email: 'admin@example.com', password: 'password123' })).resolves.toEqual({
      user: {
        id: 'admin1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        status: 'APPROVED',
      },
      accessToken: 'access-token',
    });
    expect(deps.tokenService.signAccessToken).toHaveBeenCalledWith({
      id: 'admin1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      status: 'APPROVED',
    });
  });
});
