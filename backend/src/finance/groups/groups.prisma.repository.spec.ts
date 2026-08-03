import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceGroupsRepository } from './groups.prisma.repository';

function createPrismaMock() {
  const prisma: any = {
    financeGroupMember: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    financeGroup: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    financeCategory: { findMany: jest.fn() },
    financeBudget: { findMany: jest.fn(), deleteMany: jest.fn() },
    financeExpense: { findMany: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
  return prisma;
}

const createdAt = new Date('2026-06-14T00:00:00.000Z');

function createMembershipRow(overrides: Record<string, unknown> = {}) {
  return {
    groupId: 'group1',
    userId: 'user1',
    role: 'OWNER',
    createdAt,
    updatedAt: createdAt,
    user: { id: 'user1', email: 'boo@example.com', name: 'Boo' },
    ...overrides,
  };
}

function createGroupRow() {
  return {
    id: 'group1',
    name: 'Gia đình',
    ownerId: 'user1',
    createdAt,
    updatedAt: createdAt,
    members: [createMembershipRow()],
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceGroupsRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceGroupsRepository', () => {
  it('lists memberships with group and member count', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroupMember.findMany.mockResolvedValue([
      { role: 'OWNER', createdAt, group: { ...createGroupRow(), members: [{ userId: 'user1' }, { userId: 'user2' }] } },
    ]);
    const repository = createRepository(prisma);

    const memberships = await repository.listMembershipsWithGroups('user1');

    expect(prisma.financeGroupMember.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { group: { include: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(memberships).toEqual([
      {
        role: 'OWNER',
        group: { id: 'group1', name: 'Gia đình', ownerId: 'user1', memberCount: 2, createdAt, updatedAt: createdAt },
      },
    ]);
  });

  it('creates a group with its owner membership inside a transaction', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroup.create.mockResolvedValue(createGroupRow());
    const repository = createRepository(prisma);

    const group = await repository.createGroupWithOwner('user1', 'Gia đình');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.financeGroup.create).toHaveBeenCalledWith({
      data: { name: 'Gia đình', ownerId: 'user1', members: { create: { userId: 'user1', role: 'OWNER' } } },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    expect(group.members[0]).toMatchObject({ userId: 'user1', role: 'OWNER' });
  });

  it('finds a membership scoped by group and user', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroupMember.findUnique.mockResolvedValue(createMembershipRow());
    const repository = createRepository(prisma);

    await expect(repository.findMembership('group1', 'user1')).resolves.toMatchObject({ role: 'OWNER' });
    expect(prisma.financeGroupMember.findUnique).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: 'group1', userId: 'user1' } },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    prisma.financeGroupMember.findUnique.mockResolvedValue(null);
    await expect(repository.findMembership('group1', 'ghost')).resolves.toBeNull();
  });

  it('finds users by email with the minimal projection', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    const repository = createRepository(prisma);

    await expect(repository.findUserByEmail('mai@example.com')).resolves.toEqual({
      id: 'user2',
      email: 'mai@example.com',
      name: 'Mai',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'mai@example.com' },
      select: { id: true, email: true, name: true },
    });
  });

  it('maps mutation counts to booleans', async () => {
    const prisma = createPrismaMock();
    const repository = createRepository(prisma);

    prisma.financeGroupMember.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repository.removeMember('group1', 'user2')).resolves.toBe(true);
    expect(prisma.financeGroupMember.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 'group1', userId: 'user2' },
    });

    prisma.financeGroup.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteGroupOwnedBy('group1', 'intruder')).resolves.toBe(false);
    expect(prisma.financeGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: 'group1', ownerId: 'intruder' },
    });

    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteMemberExpense('user2', 'exp1')).resolves.toBe(false);
    expect(prisma.financeExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp1', userId: 'user2' } });

    prisma.financeBudget.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repository.deleteMemberBudget('user2', 'bud1')).resolves.toBe(true);
    expect(prisma.financeBudget.deleteMany).toHaveBeenCalledWith({ where: { id: 'bud1', userId: 'user2' } });
  });

  it('loads member data with the module mappers (money as numbers)', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.findMany.mockResolvedValue([
      {
        id: 'bud1',
        userId: 'user2',
        categoryId: 'cat1',
        limitAmount: new Prisma.Decimal('2000000'),
        period: 'monthly',
        alertThreshold: 0.8,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user2',
          name: 'Ăn uống',
          description: null,
          icon: null,
          color: null,
          isSystemCategory: true,
          displayOrder: 0,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ]);
    const repository = createRepository(prisma);

    const budgets = await repository.listMemberBudgets('user2');

    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user2' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(budgets[0]).toMatchObject({ id: 'bud1', limitAmount: 2000000 });
  });
});
