import { requireAdmin, requireAuth } from './auth';

function createResponseMock() {
  return {} as any;
}

function createNextMock() {
  return jest.fn();
}

function createDepsMock(user: unknown) {
  return {
    tokenService: {
      verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user1', email: 'boo@example.com' }),
    },
    usersRepository: {
      findById: jest.fn().mockResolvedValue(user),
    },
  };
}

function createRequestMock(token = 'token') {
  return {
    header: jest.fn((name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined)),
  } as any;
}

describe('requireAuth', () => {
  it('attaches approved user with role and status', async () => {
    const deps = createDepsMock({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(deps.usersRepository.findById).toHaveBeenCalledWith('user1');
    expect(req.user).toEqual({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a valid token when the user is pending', async () => {
    const deps = createDepsMock({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(req.user).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
  });

  it('rejects a valid token when the user no longer exists', async () => {
    const deps = createDepsMock(null);
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(req.user).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
  });
});

describe('requireAdmin', () => {
  it('allows approved admins', () => {
    const req = {
      user: { id: 'admin1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', status: 'APPROVED' },
    } as any;
    const next = createNextMock();

    requireAdmin()(req, createResponseMock(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects approved non-admin users', () => {
    const req = {
      user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'APPROVED' },
    } as any;
    const next = createNextMock();

    requireAdmin()(req, createResponseMock(), next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, message: 'Admin access required' });
  });
});
