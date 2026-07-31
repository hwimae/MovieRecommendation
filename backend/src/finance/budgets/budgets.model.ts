export const FINANCE_BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;

export type FinanceBudgetPeriod = (typeof FINANCE_BUDGET_PERIODS)[number];

export type FinanceBudgetCategory = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystemCategory: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceBudget = {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: string;
  period: FinanceBudgetPeriod;
  alertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  category: FinanceBudgetCategory;
};

export type UpsertFinanceBudgetData = {
  categoryId: string;
  period: FinanceBudgetPeriod;
  limitAmount: number;
  alertThreshold: number;
};
