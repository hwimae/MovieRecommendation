import type { FinanceAdviceRepository } from './advice.repository';
import { createFinanceAdviceService } from './advice.service';

function createDeps() {
  const repository: jest.Mocked<FinanceAdviceRepository> = {
    listBudgetsWithCategory: jest.fn(),
    listRecentExpenses: jest.fn(),
    createInteractionLog: jest.fn(),
  };

  return {
    repository,
    financeAiClient: {
      extractExpenseText: jest.fn(),
      extractInvoiceImage: jest.fn(),
      generateAdvice: jest.fn(),
      chatRespond: jest.fn(),
    },
  };
}

describe('createFinanceAdviceService', () => {
  it('generates advice from the user context and logs the interaction', async () => {
    const deps = createDeps();
    deps.repository.listBudgetsWithCategory.mockResolvedValue([]);
    deps.repository.listRecentExpenses.mockResolvedValue([]);
    const aiResponse = { advice: 'Giảm ăn ngoài', highlights: [], warnings: [] };
    deps.financeAiClient.generateAdvice.mockResolvedValue(aiResponse);
    const service = createFinanceAdviceService(deps);

    const result = await service.generate('user1', 'monthly');

    expect(deps.repository.listRecentExpenses).toHaveBeenCalledWith('user1', 200);
    expect(deps.financeAiClient.generateAdvice).toHaveBeenCalledWith({
      period: 'monthly',
      budgets: [],
      expenses: [],
      locale: 'vi-VN',
    });
    expect(deps.repository.createInteractionLog).toHaveBeenCalledWith({
      userId: 'user1',
      interactionType: 'financial_advice',
      inputData: { period: 'monthly', budgets: [], expenses: [] },
      aiResponse,
    });
    expect(result).toBe(aiResponse);
  });

  it('propagates AI failures without logging an interaction', async () => {
    const deps = createDeps();
    deps.repository.listBudgetsWithCategory.mockResolvedValue([]);
    deps.repository.listRecentExpenses.mockResolvedValue([]);
    deps.financeAiClient.generateAdvice.mockRejectedValue(new Error('ai down'));
    const service = createFinanceAdviceService(deps);

    await expect(service.generate('user1', 'weekly')).rejects.toThrow('ai down');
    expect(deps.repository.createInteractionLog).not.toHaveBeenCalled();
  });
});
