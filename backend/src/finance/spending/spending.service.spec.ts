import { summarizeExpenses } from './spending.model';
import type { FinanceSpendingRepository } from './spending.repository';
import { createFinanceSpendingService } from './spending.service';

describe('summarizeExpenses', () => {
  it('groups totals per category, sorted by amount descending', () => {
    const summary = summarizeExpenses([
      { amount: 100000, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 50000.25, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 400000, category: { id: 'cat2', name: 'Nhà ở' } },
      { amount: 9999.75, category: null },
    ]);

    expect(summary.totalAmount).toBe(560000);
    expect(summary.categories).toEqual([
      { categoryId: 'cat2', categoryName: 'Nhà ở', amount: 400000 },
      { categoryId: 'cat1', categoryName: 'Ăn uống', amount: 150000.25 },
      { categoryId: null, categoryName: 'Chưa phân loại', amount: 9999.75 },
    ]);
  });

  it('returns an empty summary for no expenses', () => {
    expect(summarizeExpenses([])).toEqual({ totalAmount: 0, categories: [] });
  });
});

describe('createFinanceSpendingService', () => {
  it('summarizes the expenses loaded from the repository', async () => {
    const repository: jest.Mocked<FinanceSpendingRepository> = {
      listExpensesWithCategoryByUser: jest.fn().mockResolvedValue([
        { amount: 100000, category: { id: 'cat1', name: 'Ăn uống' } },
      ]),
    };
    const service = createFinanceSpendingService({ repository });

    await expect(service.summary('user1')).resolves.toEqual({
      totalAmount: 100000,
      categories: [{ categoryId: 'cat1', categoryName: 'Ăn uống', amount: 100000 }],
    });
    expect(repository.listExpensesWithCategoryByUser).toHaveBeenCalledWith('user1');
  });
});
