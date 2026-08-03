import type { FinanceExpense } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';
import { createFinanceExpensesService } from './expenses.service';

function createExpense(overrides: Partial<FinanceExpense> = {}): FinanceExpense {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: 125000,
    spentAt: new Date('2026-06-01T00:00:00.000Z'),
    confirmedByUser: true,
    sourceType: 'manual',
    sourceMetadata: null,
    createdAt,
    updatedAt: createdAt,
    category: null,
    invoice: null,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceExpensesRepository> {
  return {
    listByUser: jest.fn(),
    createForUser: jest.fn(),
    updateForUser: jest.fn(),
    deleteForUser: jest.fn(),
    categoryExistsForUser: jest.fn(),
  };
}

describe('createFinanceExpensesService', () => {
  it('lists expenses through the repository', async () => {
    const repository = createRepositoryMock();
    const expenses = [createExpense()];
    repository.listByUser.mockResolvedValue(expenses);
    const service = createFinanceExpensesService({ repository });

    await expect(service.list('user1')).resolves.toEqual(expenses);
    expect(repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('creates an expense, converting spentAt to a Date', async () => {
    const repository = createRepositoryMock();
    repository.categoryExistsForUser.mockResolvedValue(true);
    repository.createForUser.mockResolvedValue(createExpense());
    const service = createFinanceExpensesService({ repository });

    await service.create('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt: '2026-06-01T00:00:00.000Z',
      sourceType: 'manual',
    });

    expect(repository.categoryExistsForUser).toHaveBeenCalledWith('user1', 'cat1');
    expect(repository.createForUser).toHaveBeenCalledWith('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt: new Date('2026-06-01T00:00:00.000Z'),
      sourceType: 'manual',
    });
  });

  it('rejects a create when the category is not owned by the user', async () => {
    const repository = createRepositoryMock();
    repository.categoryExistsForUser.mockResolvedValue(false);
    const service = createFinanceExpensesService({ repository });

    await expect(
      service.create('user1', { categoryId: 'cat9', amount: 1000, sourceType: 'manual' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Finance category not found' });
    expect(repository.createForUser).not.toHaveBeenCalled();
  });

  it('skips the ownership check when no category is provided', async () => {
    const repository = createRepositoryMock();
    repository.createForUser.mockResolvedValue(createExpense({ categoryId: null }));
    const service = createFinanceExpensesService({ repository });

    await service.create('user1', { amount: 1000, sourceType: 'manual' });

    expect(repository.categoryExistsForUser).not.toHaveBeenCalled();
  });

  it('updates an expense and reports 404 when it does not exist', async () => {
    const repository = createRepositoryMock();
    repository.updateForUser.mockResolvedValue(createExpense({ description: 'Cơm tối' }));
    const service = createFinanceExpensesService({ repository });

    await expect(service.update('user1', 'exp1', { description: 'Cơm tối' })).resolves.toMatchObject({
      description: 'Cơm tối',
    });
    expect(repository.updateForUser).toHaveBeenCalledWith('user1', 'exp1', {
      description: 'Cơm tối',
      spentAt: undefined,
    });

    repository.updateForUser.mockResolvedValue(null);
    await expect(service.update('user1', 'missing', { description: 'x' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
  });

  it('removes an expense and reports 404 when nothing was deleted', async () => {
    const repository = createRepositoryMock();
    repository.deleteForUser.mockResolvedValue(true);
    const service = createFinanceExpensesService({ repository });

    await expect(service.remove('user1', 'exp1')).resolves.toBeUndefined();
    expect(repository.deleteForUser).toHaveBeenCalledWith('user1', 'exp1');

    repository.deleteForUser.mockResolvedValue(false);
    await expect(service.remove('user1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
  });
});
