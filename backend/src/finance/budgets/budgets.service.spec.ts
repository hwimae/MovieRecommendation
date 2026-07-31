import type { FinanceBudget } from './budgets.model';
import type { FinanceBudgetsRepository } from './budgets.repository';
import { createFinanceBudgetsService } from './budgets.service';

function createBudget(): FinanceBudget {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  return {
    id: 'budget1',
    userId: 'user1',
    categoryId: 'cat1',
    limitAmount: '1000000',
    period: 'monthly',
    alertThreshold: 0.8,
    createdAt,
    updatedAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: false,
      displayOrder: 0,
      createdAt,
      updatedAt,
    },
  };
}

function createRepositoryMock(): jest.Mocked<FinanceBudgetsRepository> {
  return {
    listByUser: jest.fn(),
    categoryExistsForUser: jest.fn(),
    upsert: jest.fn(),
    deleteByIdForUser: jest.fn(),
  };
}

describe('createFinanceBudgetsService', () => {
  it('lists budgets through the repository', async () => {
    const repository = createRepositoryMock();
    const budgets = [createBudget()];
    repository.listByUser.mockResolvedValue(budgets);
    const service = createFinanceBudgetsService({ repository });

    await expect(service.list('user1')).resolves.toEqual(budgets);
    expect(repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('upserts a budget when the category belongs to the user', async () => {
    const repository = createRepositoryMock();
    const budget = createBudget();
    const input = {
      categoryId: 'cat1',
      period: 'monthly' as const,
      limitAmount: 1_000_000,
      alertThreshold: 0.8,
    };
    repository.categoryExistsForUser.mockResolvedValue(true);
    repository.upsert.mockResolvedValue(budget);
    const service = createFinanceBudgetsService({ repository });

    await expect(service.upsert('user1', input)).resolves.toEqual(budget);
    expect(repository.categoryExistsForUser).toHaveBeenCalledWith('user1', 'cat1');
    expect(repository.upsert).toHaveBeenCalledWith('user1', input);
  });

  it('rejects an upsert when the category does not belong to the user', async () => {
    const repository = createRepositoryMock();
    repository.categoryExistsForUser.mockResolvedValue(false);
    const service = createFinanceBudgetsService({ repository });

    await expect(service.upsert('user1', {
      categoryId: 'cat1',
      period: 'monthly',
      limitAmount: 1_000_000,
      alertThreshold: 0.8,
    })).rejects.toThrow('Finance category not found');
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('removes a budget through the repository', async () => {
    const repository = createRepositoryMock();
    repository.deleteByIdForUser.mockResolvedValue(true);
    const service = createFinanceBudgetsService({ repository });

    await expect(service.remove('user1', 'budget1')).resolves.toBeUndefined();
    expect(repository.deleteByIdForUser).toHaveBeenCalledWith('user1', 'budget1');
  });

  it('reports a missing budget when the repository did not delete anything', async () => {
    const repository = createRepositoryMock();
    repository.deleteByIdForUser.mockResolvedValue(false);
    const service = createFinanceBudgetsService({ repository });

    await expect(service.remove('user1', 'missing')).rejects.toThrow('Finance budget not found');
  });
});
