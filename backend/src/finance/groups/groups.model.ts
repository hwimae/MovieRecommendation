import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { SpendingSummary } from '../spending/spending.model';

export const FINANCE_GROUP_ROLES = ['OWNER', 'MEMBER'] as const;
export type FinanceGroupRole = (typeof FINANCE_GROUP_ROLES)[number];

export type FinanceGroupMemberDto = {
  userId: string;
  name: string;
  email: string;
  role: FinanceGroupRole;
  joinedAt: Date;
};

export type FinanceGroupSummaryDto = {
  id: string;
  name: string;
  ownerId: string;
  currentUserRole: FinanceGroupRole;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceGroupDetailDto = FinanceGroupSummaryDto & { members: FinanceGroupMemberDto[] };

export type FinanceGroupMemberDashboardDto = {
  member: { userId: string; name: string; email: string };
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  expenses: FinanceExpense[];
  summary: SpendingSummary;
};
