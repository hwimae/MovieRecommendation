import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { CreateFinanceAiInteractionData } from './advice.model';

export interface FinanceAdviceRepository {
  listBudgetsWithCategory(userId: string): Promise<FinanceBudget[]>;
  listRecentExpenses(userId: string, take: number): Promise<FinanceExpense[]>;
  createInteractionLog(data: CreateFinanceAiInteractionData): Promise<void>;
}
