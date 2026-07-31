import type { SpendingExpense } from './spending.model';

export interface FinanceSpendingRepository {
  listExpensesWithCategoryByUser(userId: string): Promise<SpendingExpense[]>;
}
