import { Prisma, type PrismaClient } from '@prisma/client';
import { DuplicateFinanceCategoryError } from './categories.repository';
import { createPrismaFinanceCategoriesRepository } from './categories.prisma.repository';

function createPrismaMock() {
  return {
    financeCategory: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function createCategoryRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cat1',
    userId: 'user1',
    name: 'Ăn uống',
    description: null,
    icon: '🍜',
    color: '#ef4444',
    isSystemCategory: true,
    displayOrder: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function duplicateError() {
  return new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceCategoriesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceCategoriesRepository', () => {
  it('lists user categories ordered by display order then name', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([createCategoryRow()]);
    const repository = createRepository(prisma);

    const categories = await repository.listByUser('user1');

    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    expect(categories).toEqual([expect.objectContaining({ id: 'cat1', name: 'Ăn uống' })]);
  });

  it('returns only the names that already exist for the user', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([{ name: 'Ăn uống' }]);
    const repository = createRepository(prisma);

    await expect(repository.findDefaultsByNames('user1', ['Ăn uống', 'Đi lại'])).resolves.toEqual(['Ăn uống']);
    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1', name: { in: ['Ăn uống', 'Đi lại'] } },
      select: { name: true },
    });
  });

  it('creates a category for the user and translates P2002', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.create.mockResolvedValue(createCategoryRow());
    const repository = createRepository(prisma);
    const data = { name: 'Ăn uống', icon: '🍜', color: '#ef4444', displayOrder: 0, isSystemCategory: true };

    await expect(repository.create('user1', data)).resolves.toMatchObject({ id: 'cat1' });
    expect(prisma.financeCategory.create).toHaveBeenCalledWith({ data: { ...data, userId: 'user1' } });

    prisma.financeCategory.create.mockRejectedValue(duplicateError());
    await expect(repository.create('user1', data)).rejects.toBeInstanceOf(DuplicateFinanceCategoryError);
  });

  it('updates scoped by user and returns null when nothing matched', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.updateMany.mockResolvedValue({ count: 1 });
    prisma.financeCategory.findFirst.mockResolvedValue(createCategoryRow({ name: 'Cafe' }));
    const repository = createRepository(prisma);

    await expect(repository.updateForUser('user1', 'cat1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(prisma.financeCategory.updateMany).toHaveBeenCalledWith({
      where: { id: 'cat1', userId: 'user1' },
      data: { name: 'Cafe' },
    });

    prisma.financeCategory.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateForUser('user1', 'missing', { name: 'Cafe' })).resolves.toBeNull();

    prisma.financeCategory.updateMany.mockRejectedValue(duplicateError());
    await expect(repository.updateForUser('user1', 'cat1', { name: 'Cafe' })).rejects.toBeInstanceOf(
      DuplicateFinanceCategoryError,
    );
  });

  it('maps the delete count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.deleteMany.mockResolvedValue({ count: 1 });
    const repository = createRepository(prisma);

    await expect(repository.deleteForUser('user1', 'cat1')).resolves.toBe(true);
    expect(prisma.financeCategory.deleteMany).toHaveBeenCalledWith({ where: { id: 'cat1', userId: 'user1' } });

    prisma.financeCategory.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteForUser('user1', 'missing')).resolves.toBe(false);
  });
});
