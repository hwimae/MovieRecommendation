import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceExpensesRepository } from './expenses.prisma.repository';

function createPrismaMock() {
  return {
    financeExpense: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    financeCategory: {
      findFirst: jest.fn(),
    },
  };
}

function createExpenseRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: 'inv1',
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: 'Quán A',
    amount: new Prisma.Decimal('125000'),
    spentAt: new Date('2026-06-01T00:00:00.000Z'),
    confirmedByUser: true,
    sourceType: 'manual',
    sourceMetadata: null,
    createdAt,
    updatedAt: createdAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: true,
      displayOrder: 0,
      createdAt,
      updatedAt: createdAt,
    },
    invoice: {
      id: 'inv1',
      userId: 'user1',
      filename: 'bill.png',
      filePath: 'uploads/bill.png',
      storeName: 'Quán A',
      purchasedAt: new Date('2026-06-01T00:00:00.000Z'),
      totalAmount: new Prisma.Decimal('125000'),
      extractedData: null,
      status: 'processed',
      createdAt,
      updatedAt: createdAt,
    },
    ...overrides,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceExpensesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceExpensesRepository', () => {
  it('lists user expenses newest-spent first and maps money to numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.findMany.mockResolvedValue([createExpenseRow()]);
    const repository = createRepository(prisma);

    const expenses = await repository.listByUser('user1');

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { spentAt: 'desc' },
    });
    expect(expenses[0]).toMatchObject({
      id: 'exp1',
      amount: 125000,
      category: expect.objectContaining({ name: 'Ăn uống' }),
      invoice: expect.objectContaining({ totalAmount: 125000 }),
    });
  });

  it('creates an expense for the user with json metadata passthrough', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.create.mockResolvedValue(createExpenseRow());
    const repository = createRepository(prisma);
    const spentAt = new Date('2026-06-01T00:00:00.000Z');

    await repository.createForUser('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt,
      sourceType: 'manual',
      sourceMetadata: { note: 'x' },
    });

    expect(prisma.financeExpense.create).toHaveBeenCalledWith({
      data: {
        categoryId: 'cat1',
        amount: 125000,
        spentAt,
        sourceType: 'manual',
        sourceMetadata: { note: 'x' },
        userId: 'user1',
      },
      include: { category: true, invoice: true },
    });
  });

  it('updates scoped by user and returns the refreshed expense', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.updateMany.mockResolvedValue({ count: 1 });
    prisma.financeExpense.findFirst.mockResolvedValue(createExpenseRow({ description: 'Cơm tối' }));
    const repository = createRepository(prisma);

    await expect(repository.updateForUser('user1', 'exp1', { description: 'Cơm tối' })).resolves.toMatchObject({
      description: 'Cơm tối',
    });
    expect(prisma.financeExpense.updateMany).toHaveBeenCalledWith({
      where: { id: 'exp1', userId: 'user1' },
      data: { description: 'Cơm tối' },
    });
    expect(prisma.financeExpense.findFirst).toHaveBeenCalledWith({
      where: { id: 'exp1', userId: 'user1' },
      include: { category: true, invoice: true },
    });

    prisma.financeExpense.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateForUser('user1', 'missing', { description: 'x' })).resolves.toBeNull();
  });

  it('maps the delete count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 1 });
    const repository = createRepository(prisma);

    await expect(repository.deleteForUser('user1', 'exp1')).resolves.toBe(true);
    expect(prisma.financeExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp1', userId: 'user1' } });

    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteForUser('user1', 'missing')).resolves.toBe(false);
  });

  it('checks category ownership', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findFirst.mockResolvedValue({ id: 'cat1' });
    const repository = createRepository(prisma);

    await expect(repository.categoryExistsForUser('user1', 'cat1')).resolves.toBe(true);
    expect(prisma.financeCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'cat1', userId: 'user1' },
      select: { id: true },
    });

    prisma.financeCategory.findFirst.mockResolvedValue(null);
    await expect(repository.categoryExistsForUser('user1', 'missing')).resolves.toBe(false);
  });
});
