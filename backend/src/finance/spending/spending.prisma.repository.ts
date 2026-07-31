import type { PrismaClient } from '@prisma/client';
import type { FinanceSpendingRepository } from './spending.repository';

export function createPrismaFinanceSpendingRepository(prisma: PrismaClient): FinanceSpendingRepository {
  return {
    async listExpensesWithCategoryByUser(userId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: { category: true },
      });

      return expenses.map((expense) => ({
        amount: expense.amount.toNumber(),
        category: expense.category ? { id: expense.category.id, name: expense.category.name } : null,
      }));
    },
  };
}
