import type { Prisma, PrismaClient } from '@prisma/client';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import {
  FINANCE_BUDGET_PERIODS,
  type FinanceBudget,
  type FinanceBudgetPeriod,
} from './budgets.model';
import type { FinanceBudgetsRepository } from './budgets.repository';

export const includeBudgetRelations = { category: true } satisfies Prisma.FinanceBudgetInclude;

export type PrismaFinanceBudget = Prisma.FinanceBudgetGetPayload<{ include: typeof includeBudgetRelations }>;

function toFinanceBudgetPeriod(value: string): FinanceBudgetPeriod {
  if (FINANCE_BUDGET_PERIODS.includes(value as FinanceBudgetPeriod)) {
    return value as FinanceBudgetPeriod;
  }

  throw new Error(`Unsupported finance budget period: ${value}`);
}

export function toFinanceBudget(budget: PrismaFinanceBudget): FinanceBudget {
  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    limitAmount: budget.limitAmount.toNumber(),
    period: toFinanceBudgetPeriod(budget.period),
    alertThreshold: budget.alertThreshold,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
    category: toFinanceCategory(budget.category),
  };
}

export function createPrismaFinanceBudgetsRepository(prisma: PrismaClient): FinanceBudgetsRepository {
  return {
    async listByUser(userId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId },
        include: includeBudgetRelations,
        orderBy: { createdAt: 'desc' },
      });

      return budgets.map(toFinanceBudget);
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },

    async upsert(userId, input) {
      const budget = await prisma.financeBudget.upsert({
        where: {
          userId_categoryId_period: {
            userId,
            categoryId: input.categoryId,
            period: input.period,
          },
        },
        update: {
          limitAmount: input.limitAmount,
          alertThreshold: input.alertThreshold,
        },
        create: {
          userId,
          categoryId: input.categoryId,
          period: input.period,
          limitAmount: input.limitAmount,
          alertThreshold: input.alertThreshold,
        },
        include: includeBudgetRelations,
      });

      return toFinanceBudget(budget);
    },

    async deleteByIdForUser(userId, budgetId) {
      const result = await prisma.financeBudget.deleteMany({
        where: { id: budgetId, userId },
      });

      return result.count > 0;
    },
  };
}
