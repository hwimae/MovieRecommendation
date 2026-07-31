import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceAdviceRepository } from './advice.prisma.repository';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createPrismaMock() {
  return {
    financeBudget: { findMany: jest.fn() },
    financeExpense: { findMany: jest.fn() },
    financeAIInteraction: { create: jest.fn() },
  };
}

describe('createPrismaFinanceAdviceRepository', () => {
  it('loads budgets with category, money as numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.findMany.mockResolvedValue([
      {
        id: 'bud1',
        userId: 'user1',
        categoryId: 'cat1',
        limitAmount: new Prisma.Decimal('2000000'),
        period: 'monthly',
        alertThreshold: 0.8,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user1',
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
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    const budgets = await repository.listBudgetsWithCategory('user1');

    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
    });
    expect(budgets[0]).toMatchObject({ limitAmount: 2000000 });
  });

  it('loads recent expenses newest first with the requested take', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.findMany.mockResolvedValue([]);
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    await repository.listRecentExpenses('user1', 200);

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });

  it('persists the AI interaction log', async () => {
    const prisma = createPrismaMock();
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    await repository.createInteractionLog({
      userId: 'user1',
      interactionType: 'financial_advice',
      inputData: { period: 'monthly' },
      aiResponse: { advice: 'Tiết kiệm hơn' },
    });

    expect(prisma.financeAIInteraction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        interactionType: 'financial_advice',
        inputData: { period: 'monthly' },
        aiResponse: { advice: 'Tiết kiệm hơn' },
      },
    });
  });
});
