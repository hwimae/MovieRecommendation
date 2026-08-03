import type { FinanceAiClient } from '../ai-client';
import type { FinanceAdviceRepository } from './advice.repository';

export type FinanceAdviceService = {
  generate(userId: string, period: 'weekly' | 'monthly' | 'yearly'): Promise<unknown>;
};

export function createFinanceAdviceService(
  deps: { repository: FinanceAdviceRepository; financeAiClient: FinanceAiClient },
): FinanceAdviceService {
  return {
    async generate(userId, period) {
      const [budgets, expenses] = await Promise.all([
        deps.repository.listBudgetsWithCategory(userId),
        deps.repository.listRecentExpenses(userId, 200),
      ]);

      const response = await deps.financeAiClient.generateAdvice({ period, budgets, expenses, locale: 'vi-VN' });

      await deps.repository.createInteractionLog({
        userId,
        interactionType: 'financial_advice',
        inputData: { period, budgets, expenses },
        aiResponse: response,
      });

      return response;
    },
  };
}
