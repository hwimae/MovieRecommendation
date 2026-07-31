import { summarizeExpenses, type SpendingSummary } from './spending.model';
import type { FinanceSpendingRepository } from './spending.repository';

export type FinanceSpendingService = {
  summary(userId: string): Promise<SpendingSummary>;
};

export function createFinanceSpendingService(
  deps: { repository: FinanceSpendingRepository },
): FinanceSpendingService {
  return {
    async summary(userId) {
      return summarizeExpenses(await deps.repository.listExpensesWithCategoryByUser(userId));
    },
  };
}
