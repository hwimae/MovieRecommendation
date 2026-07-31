import { notFound } from '../../errors';
import type { FinanceBudget, UpsertFinanceBudgetData } from './budgets.model';
import type { FinanceBudgetsRepository } from './budgets.repository';

export type FinanceBudgetsService = {
  list(userId: string): Promise<FinanceBudget[]>;
  upsert(userId: string, input: UpsertFinanceBudgetData): Promise<FinanceBudget>;
  remove(userId: string, id: string): Promise<void>;
};

export function createFinanceBudgetsService(
  deps: { repository: FinanceBudgetsRepository },
): FinanceBudgetsService {
  async function assertCategoryOwnership(userId: string, categoryId: string): Promise<void> {
    const categoryExists = await deps.repository.categoryExistsForUser(userId, categoryId);
    if (!categoryExists) throw notFound('Finance category not found');
  }

  return {
    async list(userId) {
      return deps.repository.listByUser(userId);
    },

    async upsert(userId, input) {
      await assertCategoryOwnership(userId, input.categoryId);
      return deps.repository.upsert(userId, input);
    },

    async remove(userId, id) {
      const deleted = await deps.repository.deleteByIdForUser(userId, id);
      if (!deleted) throw notFound('Finance budget not found');
    },
  };
}
