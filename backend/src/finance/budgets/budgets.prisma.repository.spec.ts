import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceBudgetsRepository } from './budgets.prisma.repository';

function createPrismaMock() {
  return {
    financeCategory: {
      findFirst: jest.fn(),
    },
    financeBudget: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function createBudgetRow() {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  return {
    id: 'budget1',
    userId: 'user1',
    categoryId: 'cat1',
    limitAmount: new Prisma.Decimal('1000000'),
    period: 'monthly',
    alertThreshold: 0.8,
    createdAt,
    updatedAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: false,
      displayOrder: 0,
      createdAt,
      updatedAt,
    },
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceBudgetsRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceBudgetsRepository', () => {
  it('lists user budgets and maps Prisma values to the module model', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.findMany.mockResolvedValue([createBudgetRow()]);
    const repository = createRepository(prisma);

    const result = await repository.listByUser('user1');

    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'budget1',
        limitAmount: 1_000_000,
        period: 'monthly',
        category: expect.objectContaining({ id: 'cat1', name: 'Ăn uống' }),
      }),
    ]);
  });

  it('checks whether a category belongs to the user', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findFirst.mockResolvedValue({ id: 'cat1' });
    const repository = createRepository(prisma);

    await expect(repository.categoryExistsForUser('user1', 'cat1')).resolves.toBe(true);
    expect(prisma.financeCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'cat1', userId: 'user1' },
      select: { id: true },
    });

    prisma.financeCategory.findFirst.mockResolvedValue(null);
    await expect(repository.categoryExistsForUser('user1', 'missing')).resolves.toBe(false);
  });

  it('upserts a budget using the user, category, and period key', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.upsert.mockResolvedValue(createBudgetRow());
    const repository = createRepository(prisma);
    const input = {
      categoryId: 'cat1',
      period: 'monthly' as const,
      limitAmount: 1_000_000,
      alertThreshold: 0.8,
    };

    await repository.upsert('user1', input);

    expect(prisma.financeBudget.upsert).toHaveBeenCalledWith({
      where: {
        userId_categoryId_period: {
          userId: 'user1',
          categoryId: 'cat1',
          period: 'monthly',
        },
      },
      update: {
        limitAmount: 1_000_000,
        alertThreshold: 0.8,
      },
      create: {
        userId: 'user1',
        categoryId: 'cat1',
        period: 'monthly',
        limitAmount: 1_000_000,
        alertThreshold: 0.8,
      },
      include: { category: true },
    });
  });

  it('maps the Prisma delete count to a boolean', async () => {
    const prisma = createPrismaMock();
    const repository = createRepository(prisma);
    prisma.financeBudget.deleteMany.mockResolvedValue({ count: 1 });

    await expect(repository.deleteByIdForUser('user1', 'budget1')).resolves.toBe(true);
    expect(prisma.financeBudget.deleteMany).toHaveBeenCalledWith({
      where: { id: 'budget1', userId: 'user1' },
    });

    prisma.financeBudget.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteByIdForUser('user1', 'missing')).resolves.toBe(false);
  });
});
