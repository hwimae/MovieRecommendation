import { z } from 'zod';
import { FINANCE_BUDGET_PERIODS } from './budgets.model';

export const financeBudgetPeriodSchema = z.enum(FINANCE_BUDGET_PERIODS);

export const upsertFinanceBudgetSchema = z.object({
  categoryId: z.string().min(1),
  period: financeBudgetPeriodSchema.default('monthly'),
  limitAmount: z.number().positive(),
  alertThreshold: z.number().min(0).max(1).default(0.8),
});

export type UpsertFinanceBudgetInput = z.infer<typeof upsertFinanceBudgetSchema>;
