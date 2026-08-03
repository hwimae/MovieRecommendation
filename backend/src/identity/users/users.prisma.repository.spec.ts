import { Prisma, type PrismaClient } from '@prisma/client';
import { EmailAlreadyInUseError } from './users.repository';
import { createPrismaUsersRepository } from './users.prisma.repository';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createUserRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');
  return {
    id: 'user1',
    email: 'boo@example.com',
    passwordHash: 'hash',
    name: 'Boo',
    role: 'USER',
    status: 'APPROVED',
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaUsersRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaUsersRepository', () => {
  it('finds a user by id and strips the password hash', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(createUserRow());
    const repository = createRepository(prisma);

    const user = await repository.findById('user1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' } });
    expect(user).toEqual({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('returns null when the id does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(createRepository(prisma).findById('missing')).resolves.toBeNull();
  });

  it('finds a user by email including the password hash', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(createUserRow());
    const repository = createRepository(prisma);

    const user = await repository.findByEmail('boo@example.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'boo@example.com' } });
    expect(user).toMatchObject({ id: 'user1', passwordHash: 'hash' });
  });

  it('creates a user and translates P2002 into EmailAlreadyInUseError', async () => {
    const prisma = createPrismaMock();
    prisma.user.create.mockResolvedValue(createUserRow({ status: 'PENDING' }));
    const repository = createRepository(prisma);
    const data = {
      email: 'boo@example.com',
      passwordHash: 'hash',
      name: 'Boo',
      role: 'USER' as const,
      status: 'PENDING' as const,
    };

    await expect(repository.create(data)).resolves.toMatchObject({ id: 'user1', status: 'PENDING' });
    expect(prisma.user.create).toHaveBeenCalledWith({ data });

    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(repository.create(data)).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('lists users by status ordered by creation time', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany.mockResolvedValue([createUserRow()]);
    const repository = createRepository(prisma);

    const users = await repository.listByStatus('PENDING');

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  it('updates status and maps P2025 to null', async () => {
    const prisma = createPrismaMock();
    prisma.user.update.mockResolvedValue(createUserRow({ status: 'APPROVED' }));
    const repository = createRepository(prisma);

    await expect(repository.updateStatus('user1', 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user1' }, data: { status: 'APPROVED' } });

    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'test' }),
    );
    await expect(repository.updateStatus('missing', 'REJECTED')).resolves.toBeNull();
  });
});
