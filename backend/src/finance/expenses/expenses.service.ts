import { notFound } from '../../errors';
import type { CreateFinanceExpenseData, FinanceExpense, UpdateFinanceExpenseData } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';
import type { CreateFinanceExpenseInput, UpdateFinanceExpenseInput } from './expenses.schema';

export type FinanceExpensesService = {
  list(userId: string): Promise<FinanceExpense[]>;
  create(userId: string, input: CreateFinanceExpenseInput): Promise<FinanceExpense>;
  update(userId: string, id: string, input: UpdateFinanceExpenseInput): Promise<FinanceExpense>;
  remove(userId: string, id: string): Promise<void>;
};

function toCreateData(input: CreateFinanceExpenseInput): CreateFinanceExpenseData {
  return { ...input, spentAt: input.spentAt ? new Date(input.spentAt) : undefined };
}

function toUpdateData(input: UpdateFinanceExpenseInput): UpdateFinanceExpenseData {
  return { ...input, spentAt: input.spentAt ? new Date(input.spentAt) : undefined };
}

export function createFinanceExpensesService(
  deps: { repository: FinanceExpensesRepository },
): FinanceExpensesService {
  async function assertCategoryOwnership(userId: string, categoryId?: string): Promise<void> {
    if (!categoryId) return;
    const exists = await deps.repository.categoryExistsForUser(userId, categoryId);
    if (!exists) throw notFound('Finance category not found');
  }

  return {
    async list(userId) {
      return deps.repository.listByUser(userId);
    },

    async create(userId, input) {
      await assertCategoryOwnership(userId, input.categoryId);
      return deps.repository.createForUser(userId, toCreateData(input));
    },

    async update(userId, id, input) {
      await assertCategoryOwnership(userId, input.categoryId);
      const expense = await deps.repository.updateForUser(userId, id, toUpdateData(input));
      if (!expense) throw notFound('Finance expense not found');
      return expense;
    },

    async remove(userId, id) {
      const deleted = await deps.repository.deleteForUser(userId, id);
      if (!deleted) throw notFound('Finance expense not found');
    },
  };
}
