import type { FinanceCategory } from '../categories/categories.model';

export const FINANCE_BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;

export type FinanceBudgetPeriod = (typeof FINANCE_BUDGET_PERIODS)[number];

export type FinanceBudget = {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  period: FinanceBudgetPeriod;
  alertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  category: FinanceCategory;
};

export type UpsertFinanceBudgetData = {
  categoryId: string;
  period: FinanceBudgetPeriod;
  limitAmount: number;
  alertThreshold: number;
};
