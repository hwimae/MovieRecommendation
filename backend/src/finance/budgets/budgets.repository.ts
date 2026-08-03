import type { FinanceBudget, UpsertFinanceBudgetData } from './budgets.model';

export interface FinanceBudgetsRepository {
  listByUser(userId: string): Promise<FinanceBudget[]>;
  categoryExistsForUser(userId: string, categoryId: string): Promise<boolean>;
  upsert(userId: string, input: UpsertFinanceBudgetData): Promise<FinanceBudget>;
  deleteByIdForUser(userId: string, budgetId: string): Promise<boolean>;
}
