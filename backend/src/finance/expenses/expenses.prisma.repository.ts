import type { FinanceInvoice as PrismaFinanceInvoice, Prisma, PrismaClient } from '@prisma/client';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import type { FinanceInvoice } from '../invoices/invoices.model';
import type { FinanceExpense } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';

export const includeExpenseRelations = { category: true, invoice: true } satisfies Prisma.FinanceExpenseInclude;

export type PrismaFinanceExpense = Prisma.FinanceExpenseGetPayload<{ include: typeof includeExpenseRelations }>;

export function toFinanceInvoice(invoice: PrismaFinanceInvoice): FinanceInvoice {
  return {
    id: invoice.id,
    userId: invoice.userId,
    filename: invoice.filename,
    filePath: invoice.filePath,
    storeName: invoice.storeName,
    purchasedAt: invoice.purchasedAt,
    totalAmount: invoice.totalAmount === null ? null : invoice.totalAmount.toNumber(),
    extractedData: invoice.extractedData,
    status: invoice.status,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export function toFinanceExpense(expense: PrismaFinanceExpense): FinanceExpense {
  return {
    id: expense.id,
    userId: expense.userId,
    invoiceId: expense.invoiceId,
    categoryId: expense.categoryId,
    description: expense.description,
    merchantName: expense.merchantName,
    amount: expense.amount.toNumber(),
    spentAt: expense.spentAt,
    confirmedByUser: expense.confirmedByUser,
    sourceType: expense.sourceType,
    sourceMetadata: expense.sourceMetadata,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    category: expense.category ? toFinanceCategory(expense.category) : null,
    invoice: expense.invoice ? toFinanceInvoice(expense.invoice) : null,
  };
}

function toExpenseWriteData<T extends { sourceMetadata?: unknown }>(data: T) {
  return { ...data, sourceMetadata: data.sourceMetadata as Prisma.InputJsonValue | undefined };
}

export function createPrismaFinanceExpensesRepository(prisma: PrismaClient): FinanceExpensesRepository {
  return {
    async listByUser(userId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: includeExpenseRelations,
        orderBy: { spentAt: 'desc' },
      });

      return expenses.map(toFinanceExpense);
    },

    async createForUser(userId, data) {
      const expense = await prisma.financeExpense.create({
        data: { ...toExpenseWriteData(data), userId } as Prisma.FinanceExpenseUncheckedCreateInput,
        include: includeExpenseRelations,
      });

      return toFinanceExpense(expense);
    },

    async updateForUser(userId, id, data) {
      const result = await prisma.financeExpense.updateMany({
        where: { id, userId },
        data: toExpenseWriteData(data) as Prisma.FinanceExpenseUncheckedUpdateInput,
      });
      if (result.count === 0) return null;

      const expense = await prisma.financeExpense.findFirst({
        where: { id, userId },
        include: includeExpenseRelations,
      });

      return expense ? toFinanceExpense(expense) : null;
    },

    async deleteForUser(userId, id) {
      const result = await prisma.financeExpense.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },
  };
}
