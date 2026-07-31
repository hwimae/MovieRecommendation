import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';
import { createFinanceCategoriesService, DEFAULT_FINANCE_CATEGORIES } from './categories.service';

function createCategory(overrides: Partial<FinanceCategory> = {}): FinanceCategory {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cat1',
    userId: 'user1',
    name: 'Ăn uống',
    description: null,
    icon: '🍜',
    color: '#ef4444',
    isSystemCategory: false,
    displayOrder: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceCategoriesRepository> {
  return {
    listByUser: jest.fn(),
    findDefaultsByNames: jest.fn(),
    create: jest.fn(),
    updateForUser: jest.fn(),
    deleteForUser: jest.fn(),
  };
}

const ALL_DEFAULT_NAMES = DEFAULT_FINANCE_CATEGORIES.map((category) => category.name);

describe('createFinanceCategoriesService', () => {
  it('seeds only the missing default categories with their display order', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES.slice(1));
    repository.create.mockResolvedValue(createCategory());
    const service = createFinanceCategoriesService({ repository });

    await service.ensureDefaults('user1');

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith('user1', {
      ...DEFAULT_FINANCE_CATEGORIES[0],
      displayOrder: 0,
      isSystemCategory: true,
    });
  });

  it('ignores duplicate errors while seeding defaults', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue([]);
    repository.create.mockRejectedValue(new DuplicateFinanceCategoryError());
    const service = createFinanceCategoriesService({ repository });

    await expect(service.ensureDefaults('user1')).resolves.toBeUndefined();
    expect(repository.create).toHaveBeenCalledTimes(DEFAULT_FINANCE_CATEGORIES.length);
  });

  it('lists categories after seeding defaults', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES);
    const categories = [createCategory()];
    repository.listByUser.mockResolvedValue(categories);
    const service = createFinanceCategoriesService({ repository });

    await expect(service.list('user1')).resolves.toEqual(categories);
    expect(repository.findDefaultsByNames).toHaveBeenCalledWith('user1', ALL_DEFAULT_NAMES);
    expect(repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('creates a non-system category and maps duplicates to 409', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES);
    repository.create.mockResolvedValue(createCategory({ name: 'Cafe' }));
    const service = createFinanceCategoriesService({ repository });

    await expect(service.create('user1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(repository.create).toHaveBeenCalledWith('user1', { name: 'Cafe', isSystemCategory: false });

    repository.create.mockRejectedValue(new DuplicateFinanceCategoryError());
    await expect(service.create('user1', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance category already exists',
    });
  });

  it('updates a category and reports 404 when it does not exist', async () => {
    const repository = createRepositoryMock();
    repository.updateForUser.mockResolvedValue(createCategory({ name: 'Cafe' }));
    const service = createFinanceCategoriesService({ repository });

    await expect(service.update('user1', 'cat1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(repository.updateForUser).toHaveBeenCalledWith('user1', 'cat1', { name: 'Cafe' });

    repository.updateForUser.mockResolvedValue(null);
    await expect(service.update('user1', 'missing', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance category not found',
    });

    repository.updateForUser.mockRejectedValue(new DuplicateFinanceCategoryError());
    await expect(service.update('user1', 'cat1', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance category already exists',
    });
  });

  it('removes a category and reports 404 when nothing was deleted', async () => {
    const repository = createRepositoryMock();
    repository.deleteForUser.mockResolvedValue(true);
    const service = createFinanceCategoriesService({ repository });

    await expect(service.remove('user1', 'cat1')).resolves.toBeUndefined();

    repository.deleteForUser.mockResolvedValue(false);
    await expect(service.remove('user1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance category not found',
    });
  });
});
