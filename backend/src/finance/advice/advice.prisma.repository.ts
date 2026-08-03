import type { Prisma, PrismaClient } from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type { FinanceAdviceRepository } from './advice.repository';

export function createPrismaFinanceAdviceRepository(prisma: PrismaClient): FinanceAdviceRepository {
  return {
    async listBudgetsWithCategory(userId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId },
        include: includeBudgetRelations,
      });

      return budgets.map(toFinanceBudget);
    },

    async listRecentExpenses(userId, take) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: includeExpenseRelations,
        orderBy: { createdAt: 'desc' },
        take,
      });

      return expenses.map(toFinanceExpense);
    },

    async createInteractionLog(data) {
      await prisma.financeAIInteraction.create({
        data: {
          userId: data.userId,
          interactionType: data.interactionType,
          inputData: data.inputData as Prisma.InputJsonValue,
          aiResponse: data.aiResponse as Prisma.InputJsonValue,
        },
      });
    },
  };
}
