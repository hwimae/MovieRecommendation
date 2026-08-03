import type { CreateFinanceExpenseData, FinanceExpense, UpdateFinanceExpenseData } from './expenses.model';

export interface FinanceExpensesRepository {
  listByUser(userId: string): Promise<FinanceExpense[]>;
  createForUser(userId: string, data: CreateFinanceExpenseData): Promise<FinanceExpense>;
  updateForUser(userId: string, id: string, data: UpdateFinanceExpenseData): Promise<FinanceExpense | null>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
  categoryExistsForUser(userId: string, categoryId: string): Promise<boolean>;
}
