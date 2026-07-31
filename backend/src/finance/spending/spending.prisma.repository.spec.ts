import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceSpendingRepository } from './spending.prisma.repository';

describe('createPrismaFinanceSpendingRepository', () => {
  it('loads user expenses with their category and maps money to numbers', async () => {
    const prisma = {
      financeExpense: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('125000.50'),
            category: { id: 'cat1', name: 'Ăn uống', icon: '🍜' },
          },
          { amount: new Prisma.Decimal('40000'), category: null },
        ]),
      },
    };

    const repository = createPrismaFinanceSpendingRepository(prisma as unknown as PrismaClient);
    const expenses = await repository.listExpensesWithCategoryByUser('user1');

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
    });
    expect(expenses).toEqual([
      { amount: 125000.5, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 40000, category: null },
    ]);
  });
});
